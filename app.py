from flask import Flask, render_template, request, jsonify, send_file
import json
import io
import re
import requests
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__)

# ===================================================
# 1. METADATA & KNOWLEDGE BASE
# ===================================================

KNOWN_LICENSES = {
    # Python
    "django": "BSD-3-Clause", "flask": "BSD-3-Clause", "requests": "Apache-2.0",
    "pillow": "HPND", "numpy": "BSD-3-Clause", "pandas": "BSD-3-Clause",
    "scipy": "BSD-3-Clause", "celery": "BSD-3-Clause", "urllib3": "MIT",
    "gunicorn": "WSF", "pytest": "MIT", "click": "BSD-3-Clause",
    "jinja2": "BSD-3-Clause", "werkzeug": "BSD-3-Clause", "cryptography": "Apache-2.0",
    "pydantic": "MIT", "fastapi": "MIT", "sqlalchemy": "MIT",
    # JavaScript / Node.js
    "express": "MIT", "lodash": "MIT", "axios": "MIT", "react": "MIT",
    "vue": "MIT", "next": "MIT", "typescript": "Apache-2.0", "webpack": "MIT",
    "mocha": "MIT", "jest": "MIT", "chalk": "MIT", "debug": "MIT",
    "moment": "MIT", "commander": "MIT", "socket.io": "MIT", "mongoose": "MIT"
}

KNOWN_SUBDEPS = {
    "flask": ["werkzeug", "jinja2", "click", "itsdangerous", "markupsafe"],
    "django": ["asgiref", "sqlparse", "pytz"],
    "requests": ["urllib3", "certifi", "chardet", "idna"],
    "celery": ["kombu", "billiard", "vine", "amqp"],
    "express": ["accepts", "cookie", "qs", "send", "serve-static"],
    "axios": ["follow-redirects", "form-data"],
    "fastapi": ["starlette", "pydantic", "typing-extensions"]
}

# ===================================================
# 2. MULTI-ECOSYSTEM MANIFEST PARSERS
# ===================================================

def parse_python_manifest(content):
    packages = []
    for line in content.split('\n'):
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue
        # Strip inline comments and environment markers (; python_version > '3.7')
        clean_line = line.split('#')[0].split(';')[0].strip()
        match = re.match(r'^([a-zA-Z0-9_\-\.]+)(?:[=><~!\^]+)?(.*)?$', clean_line)
        if match:
            name = match.group(1).strip().lower()
            raw_version = match.group(2).strip() if match.group(2) else ""
            # Clean version string (take first exact version if range specified)
            version = re.sub(r'[=><~!\^]', '', raw_version).split(',')[0].strip()
            packages.append({
                "name": name, 
                "version": version if version else "unknown",
                "ecosystem": "PyPI"
            })
    return packages

def parse_npm_manifest(content):
    packages = []
    try:
        data = json.loads(content)
        # Handle package.json
        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})
        peer_deps = data.get('peerDependencies', {})
        all_deps = {**deps, **dev_deps, **peer_deps}
        
        # Handle package-lock.json v2/v3 packages key
        if 'packages' in data and isinstance(data['packages'], dict):
            for pkg_path, pkg_info in data['packages'].items():
                if pkg_path and pkg_info.get('version'):
                    pkg_name = pkg_path.replace('node_modules/', '').strip()
                    if pkg_name and not pkg_name.startswith('.'):
                        packages.append({
                            "name": pkg_name.lower(),
                            "version": pkg_info['version'].strip(),
                            "ecosystem": "npm"
                        })
            if packages:
                return packages

        for name, version in all_deps.items():
            clean_version = re.sub(r'[\^~>=<!]', '', str(version)).strip()
            packages.append({
                "name": name.lower(), 
                "version": clean_version if clean_version else "unknown",
                "ecosystem": "npm"
            })
    except Exception:
        pass
    return packages

def parse_cyclonedx_sbom(content):
    packages = []
    try:
        data = json.loads(content)
        components = data.get('components', [])
        for comp in components:
            name = comp.get('name', '').strip()
            version = comp.get('version', '').strip()
            purl = comp.get('purl', '')
            ecosystem = "PyPI"
            if 'pkg:npm' in purl or comp.get('type') == 'npm':
                ecosystem = "npm"
            elif 'pkg:golang' in purl:
                ecosystem = "Go"
            elif 'pkg:cargo' in purl:
                ecosystem = "crates.io"
            elif 'pkg:maven' in purl:
                ecosystem = "Maven"

            if name:
                packages.append({
                    "name": name.lower(),
                    "version": version if version else "unknown",
                    "ecosystem": ecosystem,
                    "license": comp.get('licenses', [{}])[0].get('license', {}).get('id', 'Unknown') if comp.get('licenses') else 'Unknown'
                })
    except Exception:
        pass
    return packages

def parse_cargo_manifest(content):
    packages = []
    for line in content.split('\n'):
        match = re.match(r'^([a-zA-Z0-9_\-]+)\s*=\s*["\']([^"\']+)["\']', line.strip())
        if match and match.group(1) != "name" and match.group(1) != "version":
            packages.append({
                "name": match.group(1).lower(),
                "version": match.group(2).strip(),
                "ecosystem": "crates.io"
            })
    return packages

def parse_go_mod(content):
    packages = []
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('require') or ' ' in line:
            parts = line.replace('require', '').replace('(', '').replace(')', '').strip().split()
            if len(parts) >= 2:
                packages.append({
                    "name": parts[0],
                    "version": parts[1].replace('v', ''),
                    "ecosystem": "Go"
                })
    return packages

# ===================================================
# 3. OSV VULNERABILITY INTELLIGENCE & ENRICHMENT
# ===================================================

def fetch_vuln_detail(vuln_id):
    try:
        r = requests.get(f"https://api.osv.dev/v1/vulns/{vuln_id}", timeout=6)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    return None

def query_and_enrich_osv(packages):
    if not packages:
        return []
    
    # 1. Batch query OSV API
    queries = []
    for pkg in packages:
        q = {"package": {"name": pkg['name'], "ecosystem": pkg['ecosystem']}}
        if pkg['version'] != "unknown":
            q["version"] = pkg['version']
        queries.append(q)
    
    osv_results = []
    try:
        response = requests.post("https://api.osv.dev/v1/querybatch", json={"queries": queries}, timeout=12)
        if response.status_code == 200:
            osv_results = response.json().get("results", [])
    except Exception as e:
        print(f"OSV Batch Error: {e}")
        osv_results = [{} for _ in packages]

    # 2. Gather top vulnerability IDs for enrichment
    ids_to_fetch = []
    for idx, res in enumerate(osv_results):
        vulns = res.get("vulns", [])
        if vulns:
            top_id = vulns[0].get("id")
            if top_id:
                ids_to_fetch.append((idx, top_id))

    # 3. Fetch detailed advisories in parallel
    enriched_details = {}
    if ids_to_fetch:
        with ThreadPoolExecutor(max_workers=8) as executor:
            fetched = list(executor.map(lambda item: (item[0], fetch_vuln_detail(item[1])), ids_to_fetch))
            for idx, detail in fetched:
                if detail:
                    enriched_details[idx] = detail

    return osv_results, enriched_details

# ===================================================
# 4. ROUTING & CORE API
# ===================================================

@app.route('/')
def login():
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    return render_template('index.html')

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    filename = file.filename.lower()
    content = file.read().decode('utf-8', errors='ignore')

    packages = []
    project_name = "Uploaded Target System"

    # Identify manifest type
    if filename.endswith('.txt') or 'requirements' in filename or 'pipfile' in filename:
        project_name = "Python Environment Analysis"
        packages = parse_python_manifest(content)
    elif filename.endswith('.json'):
        if 'bomformat' in content.lower() or 'cyclonedx' in content.lower():
            project_name = "CycloneDX SBOM Ingestion"
            packages = parse_cyclonedx_sbom(content)
        else:
            project_name = "Node.js Application Analysis"
            packages = parse_npm_manifest(content)
    elif filename.endswith('cargo.toml') or filename.endswith('cargo.lock'):
        project_name = "Rust / Cargo Package Analysis"
        packages = parse_cargo_manifest(content)
    elif filename.endswith('go.mod'):
        project_name = "Go Module Dependencies"
        packages = parse_go_mod(content)
    else:
        # Fallback to python lines
        packages = parse_python_manifest(content)

    if not packages:
        return jsonify({"error": "No valid packages found in uploaded file. Please upload a requirements.txt, package.json, or CycloneDX SBOM."}), 400

    # Deduplicate packages
    unique_map = {}
    for p in packages:
        key = f"{p['name']}@{p['version']}"
        if key not in unique_map:
            unique_map[key] = p
    packages = list(unique_map.values())

    osv_results, enriched_details = query_and_enrich_osv(packages)

    processed_packages = []
    nodes = [{"id": "root", "name": project_name, "label": project_name, "type": "root", "isRoot": True}]
    links = []
    stats = {"total": len(packages), "vulnerable": 0, "clean": 0}

    # Track packages present to build realistic dependency links
    pkg_name_set = {p['name'] for p in packages}

    for idx, pkg in enumerate(packages):
        name = pkg['name']
        version = pkg['version']
        ecosystem = pkg.get('ecosystem', 'PyPI')
        license_name = pkg.get('license') or KNOWN_LICENSES.get(name, "MIT" if ecosystem == "npm" else "BSD-3-Clause")

        vulns = osv_results[idx].get("vulns", []) if idx < len(osv_results) else []
        detail = enriched_details.get(idx)

        if vulns or detail:
            stats["vulnerable"] += 1
            severity = "HIGH"
            
            cves = []
            if detail and 'aliases' in detail:
                cves = [a for a in detail['aliases'] if a.startswith('CVE')]
            cve_id = cves[0] if cves else (detail.get("id") if detail else (vulns[0].get("id") if vulns else "VULN-DETECTED"))

            summary = (detail.get("summary") or (detail.get("details", "")[:120] + "...") if detail else "Security vulnerability detected in dependency.")

            # Calculate severity from database_specific or CVSS vectors
            if detail:
                db_sev = (detail.get('database_specific', {}).get('severity') or 
                          detail.get('ecosystem_specific', {}).get('severity'))
                if db_sev:
                    db_sev_upper = db_sev.upper()
                    if db_sev_upper == "MODERATE":
                        severity = "MEDIUM"
                    elif db_sev_upper in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                        severity = db_sev_upper
                elif 'severity' in detail:
                    for sev in detail['severity']:
                        vec = sev.get('score', '')
                        if 'C:H/I:H/A:H' in vec or ('AV:N' in vec and 'AC:L' in vec and 'C:H' in vec and 'I:H' in vec):
                            severity = "CRITICAL"
                            break
                        elif 'C:H' in vec or 'I:H' in vec or 'A:H' in vec:
                            severity = "HIGH"
                            break
                        elif 'C:L' in vec or 'I:L' in vec or 'A:L' in vec:
                            severity = "MEDIUM"
                            break

            # Extract exact fix recommendation
            fix = "Upgrade to latest safe version"
            if detail and 'affected' in detail:
                fixed_versions = []
                for affected in detail['affected']:
                    for r in affected.get('ranges', []):
                        for event in r.get('events', []):
                            if 'fixed' in event:
                                fixed_versions.append(event['fixed'])
                if fixed_versions:
                    fix = f"Upgrade to v{fixed_versions[0]}"

        else:
            stats["clean"] += 1
            severity = "CLEAN"
            cve_id = None
            fix = "Up to date"
            summary = "No known vulnerabilities found."

        processed_packages.append({
            "name": name,
            "version": version,
            "ecosystem": ecosystem,
            "license": license_name,
            "severity": severity,
            "cve": cve_id,
            "fix": fix,
            "context": summary,
            "vuln_details": vulns
        })

        nodes.append({
            "id": name,
            "name": f"{name} v{version}",
            "label": name,
            "version": version,
            "type": "package",
            "severity": severity,
            "cve": cve_id,
            "fix": fix,
            "context": summary,
            "license": license_name,
            "radius": 7 if severity in ["CRITICAL", "HIGH"] else 6
        })

        # Connect sub-dependencies or default to root
        parent_found = False
        for parent_pkg, sub_list in KNOWN_SUBDEPS.items():
            if name in sub_list and parent_pkg in pkg_name_set:
                links.append({"source": parent_pkg, "target": name})
                parent_found = True
                break
        
        if not parent_found:
            links.append({"source": "root", "target": name})

    return jsonify({
        "project_name": project_name,
        "stats": stats,
        "packages": processed_packages,
        "graph": {"nodes": nodes, "links": links}
    })

@app.route('/api/sample/<type>')
def sample(type):
    if type == 'python':
        return jsonify({
            "project_name": "Python E-Commerce Backend",
            "stats": {"total": 5, "vulnerable": 2, "clean": 3},
            "packages": [
                {"name": "flask", "version": "2.0.1", "ecosystem": "PyPI", "license": "BSD-3-Clause", "severity": "CLEAN", "cve": None, "fix": "Up to date", "context": "No known vulnerabilities found."},
                {"name": "django", "version": "3.1.2", "ecosystem": "PyPI", "license": "BSD-3-Clause", "severity": "HIGH", "cve": "CVE-2021-33203", "fix": "Upgrade to v3.2.19", "context": "Directory traversal vulnerability in Django 3.1.2 via storage backend."},
                {"name": "celery", "version": "5.0.5", "ecosystem": "PyPI", "license": "BSD-3-Clause", "severity": "CLEAN", "cve": None, "fix": "Up to date", "context": "No known vulnerabilities found."},
                {"name": "requests", "version": "2.25.1", "ecosystem": "PyPI", "license": "Apache-2.0", "severity": "CLEAN", "cve": None, "fix": "Up to date", "context": "No known vulnerabilities found."},
                {"name": "pillow", "version": "8.1.0", "ecosystem": "PyPI", "license": "HPND", "severity": "CRITICAL", "cve": "CVE-2021-34552", "fix": "Upgrade to v8.3.2", "context": "Buffer overflow in Pillow image converter allows remote arbitrary code execution."}
            ],
            "graph": {
                "nodes": [
                    {"id": "root", "name": "Python E-Commerce", "label": "Python E-Commerce", "type": "root", "isRoot": True},
                    {"id": "flask", "name": "Flask v2.0.1", "label": "flask", "version": "2.0.1", "type": "package", "severity": "CLEAN", "radius": 6, "license": "BSD-3-Clause", "context": "No known vulnerabilities found."},
                    {"id": "django", "name": "Django v3.1.2", "label": "django", "version": "3.1.2", "type": "package", "severity": "HIGH", "radius": 7, "cve": "CVE-2021-33203", "fix": "Upgrade to v3.2.19", "license": "BSD-3-Clause", "context": "Directory traversal vulnerability in Django 3.1.2 via storage backend."},
                    {"id": "celery", "name": "Celery v5.0.5", "label": "celery", "version": "5.0.5", "type": "package", "severity": "CLEAN", "radius": 6, "license": "BSD-3-Clause", "context": "No known vulnerabilities found."},
                    {"id": "requests", "name": "Requests v2.25.1", "label": "requests", "version": "2.25.1", "type": "package", "severity": "CLEAN", "radius": 6, "license": "Apache-2.0", "context": "No known vulnerabilities found."},
                    {"id": "pillow", "name": "Pillow v8.1.0", "label": "pillow", "version": "8.1.0", "type": "package", "severity": "CRITICAL", "radius": 8, "cve": "CVE-2021-34552", "fix": "Upgrade to v8.3.2", "license": "HPND", "context": "Buffer overflow in Pillow image converter allows remote arbitrary code execution."}
                ],
                "links": [
                    {"source": "root", "target": "flask"}, {"source": "root", "target": "django"},
                    {"source": "root", "target": "celery"}, {"source": "flask", "target": "requests"},
                    {"source": "django", "target": "pillow"}
                ]
            }
        })
    else:
        return jsonify({
            "project_name": "Node.js API Gateway",
            "stats": {"total": 4, "vulnerable": 2, "clean": 2},
            "packages": [
                {"name": "express", "version": "4.17.1", "ecosystem": "npm", "license": "MIT", "severity": "CLEAN", "cve": None, "fix": "Up to date", "context": "No known vulnerabilities found."},
                {"name": "axios", "version": "0.21.0", "ecosystem": "npm", "license": "MIT", "severity": "HIGH", "cve": "CVE-2020-28168", "fix": "Upgrade to v0.21.1", "context": "Server-Side Request Forgery in axios via malicious redirect."},
                {"name": "lodash", "version": "4.17.19", "ecosystem": "npm", "license": "MIT", "severity": "CRITICAL", "cve": "CVE-2020-8203", "fix": "Upgrade to v4.17.21", "context": "Prototype pollution vulnerability in lodash via zipObjectDeep function."},
                {"name": "mocha", "version": "10.2.0", "ecosystem": "npm", "license": "MIT", "severity": "CLEAN", "cve": None, "fix": "Up to date", "context": "No known vulnerabilities found."}
            ],
            "graph": {
                "nodes": [
                    {"id": "root", "name": "API Gateway", "label": "API Gateway", "type": "root", "isRoot": True},
                    {"id": "express", "name": "Express v4.17.1", "label": "express", "version": "4.17.1", "type": "package", "severity": "CLEAN", "radius": 6, "license": "MIT", "context": "No known vulnerabilities found."},
                    {"id": "axios", "name": "Axios v0.21.0", "label": "axios", "version": "0.21.0", "type": "package", "severity": "HIGH", "radius": 7, "cve": "CVE-2020-28168", "fix": "Upgrade to v0.21.1", "license": "MIT", "context": "Server-Side Request Forgery in axios via malicious redirect."},
                    {"id": "lodash", "name": "Lodash v4.17.19", "label": "lodash", "version": "4.17.19", "type": "package", "severity": "CRITICAL", "radius": 8, "cve": "CVE-2020-8203", "fix": "Upgrade to v4.17.21", "license": "MIT", "context": "Prototype pollution vulnerability in lodash via zipObjectDeep function."},
                    {"id": "mocha", "name": "Mocha v10.2.0", "label": "mocha", "version": "10.2.0", "type": "package", "severity": "CLEAN", "radius": 6, "license": "MIT", "context": "No known vulnerabilities found."}
                ],
                "links": [
                    {"source": "root", "target": "express"}, {"source": "express", "target": "axios"},
                    {"source": "express", "target": "lodash"}, {"source": "root", "target": "mocha"}
                ]
            }
        })

@app.route('/api/export', methods=['POST'])
def export_sbom():
    data = request.json or {}
    components = []
    vulnerabilities = []
    
    for pkg in data.get('packages', []):
        ecosystem = pkg.get('ecosystem', 'pypi').lower()
        bom_ref = f"pkg:{ecosystem}/{pkg['name']}@{pkg['version']}"
        
        components.append({
            "type": "library", 
            "bom-ref": bom_ref,
            "name": pkg['name'], 
            "version": pkg['version'], 
            "purl": bom_ref,
            "licenses": [{"license": {"id": pkg.get('license', 'Unknown')}}]
        })
        
        if pkg.get('cve') or pkg.get('vuln_details'):
            vuln_id = pkg.get('cve') or (pkg.get('vuln_details', [{}])[0].get('id') if pkg.get('vuln_details') else "CVE-UNKNOWN")
            vulnerabilities.append({
                "id": vuln_id,
                "source": {"name": "OSV / NVD"},
                "affects": [{"ref": bom_ref}],
                "description": pkg.get("context", "Vulnerability detected in dependency."),
                "ratings": [{
                    "source": {"name": "NVD"},
                    "severity": pkg.get("severity", "HIGH").lower()
                }],
                "recommendation": pkg.get("fix", "Upgrade component")
            })

    cyclonedx = {
        "bomFormat": "CycloneDX", 
        "specVersion": "1.5",
        "serialNumber": "urn:uuid:7f3b890a-5c12-4e89-a291-8e930129bc71",
        "version": 1,
        "metadata": {
            "timestamp": "2026-08-21T12:00:00Z",
            "tools": [{"vendor": "SBOM Guardian", "name": "SBOM-Guardian-Engine", "version": "2.0.0"}],
            "component": {
                "type": "application", 
                "name": data.get('project_name', 'Analyzed Target Application'),
                "version": "1.0.0"
            }
        },
        "components": components
    }
    
    if vulnerabilities:
        cyclonedx["vulnerabilities"] = vulnerabilities

    mem = io.BytesIO()
    mem.write(json.dumps(cyclonedx, indent=2).encode('utf-8'))
    mem.seek(0)
    return send_file(mem, as_attachment=True, download_name='cyclonedx-sbom.json', mimetype='application/json')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
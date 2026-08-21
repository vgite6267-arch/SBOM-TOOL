import requests
import json

base_url = "http://127.0.0.1:5000"

print("--- Testing Python Upload ---")
with open("c:/Users/Sahil Umesh Tambe/Downloads/sbom-tool/sample_requirements.txt", "rb") as f:
    r = requests.post(f"{base_url}/api/upload", files={"file": ("requirements.txt", f)})
data = r.json()
print("Project Name:", data['project_name'])
print("Stats:", data['stats'])
for p in data['packages']:
    print(f"  • {p['name']} (v{p['version']}) -> Severity: {p['severity']} | CVE: {p['cve']} | Fix: {p['fix']}")

print("\n--- Testing Node.js Upload ---")
with open("c:/Users/Sahil Umesh Tambe/Downloads/sbom-tool/test_node_app.json", "rb") as f:
    r = requests.post(f"{base_url}/api/upload", files={"file": ("package.json", f)})
data = r.json()
print("Project Name:", data['project_name'])
print("Stats:", data['stats'])
for p in data['packages']:
    print(f"  • {p['name']} (v{p['version']}) -> Severity: {p['severity']} | CVE: {p['cve']} | Fix: {p['fix']}")

print("\n--- Testing CycloneDX Export ---")
r = requests.post(f"{base_url}/api/export", json=data)
print("Export Response:", r.status_code, "Size:", len(r.content), "bytes")
cyclone = json.loads(r.content)
print("CycloneDX BOM Format:", cyclone.get("bomFormat"), cyclone.get("specVersion"))
print("Total Components in Exported SBOM:", len(cyclone.get("components", [])))
print("Total Vulnerabilities in Exported SBOM:", len(cyclone.get("vulnerabilities", [])))

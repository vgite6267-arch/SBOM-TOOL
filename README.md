# 🛡️ SBOM Guardian — 3D WebGL Supply Chain Intelligence & Vulnerability Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-brightgreen.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Backend-Flask-black.svg)](https://flask.palletsprojects.com/)
[![CycloneDX](https://img.shields.io/badge/Standard-CycloneDX%20v1.5-orange.svg)](https://cyclonedx.org/)
[![Vulnerability DB](https://img.shields.io/badge/Vulnerability%20DB-Google%20OSV%20API-red.svg)](https://osv.dev/)

**SBOM Guardian** is a Software Bill of Materials (SBOM) ingestion, analysis, and 3D visualization platform. It empowers security engineers, auditors, and developers to ingest software dependency manifests, query real-time vulnerability databases (Google OSV), explore supply chain topology in interactive **3D WebGL**, and export audit-ready **CycloneDX v1.5 standard SBOMs** and **PDF remediation reports**.

---

## 🚀 Getting Started

### Installation
```bash
pip install -r requirements.txt
python app.py
```
Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000)

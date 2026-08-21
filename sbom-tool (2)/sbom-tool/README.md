# 🛡️ SBOM Guardian — 3D WebGL Supply Chain Intelligence & Vulnerability Visualizer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.8%2B-brightgreen.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Backend-Flask-black.svg)](https://flask.palletsprojects.com/)
[![CycloneDX](https://img.shields.io/badge/Standard-CycloneDX%20v1.5-orange.svg)](https://cyclonedx.org/)
[![Vulnerability DB](https://img.shields.io/badge/Vulnerability%20DB-Google%20OSV%20API-red.svg)](https://osv.dev/)

**SBOM Guardian** is a Software Bill of Materials (SBOM) ingestion, analysis, and 3D visualization platform. It empowers security engineers, auditors, and developers to ingest software dependency manifests, query real-time vulnerability databases (Google OSV), explore supply chain topology in interactive **3D WebGL**, and export audit-ready **CycloneDX v1.5 standard SBOMs** and **PDF remediation reports**.

---

## ✨ Features

- **🌐 Interactive 3D WebGL & 2D Force Graph Visualizer**
  - True 3D particle force-directed dependency topology powered by Three.js and `3d-force-graph`.
  - Color-coded severity nodes (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `CLEAN`).
  - Interactive node inspection with license, context, CVE IDs, and fix recommendations.
  - Smooth auto-rotation, 3D camera pan/zoom/reset, and seamless 2D/3D toggle.
- **⚡ Live Vulnerability Intelligence (Google OSV API)**
  - Multi-threaded parallel vulnerability queries and CVE resolution.
  - Accurate CVSS v3 severity classification.
  - Actionable upgrade recommendations (e.g. `Upgrade to v10.2.0`).
- **📦 Multi-Ecosystem Manifest Ingestion**
  - **Python**: `requirements.txt`, `Pipfile`, `pyproject.toml`, `setup.py`
  - **Node.js**: `package.json`, `package-lock.json`
  - **Direct CycloneDX SBOM Ingestion**: Drop pre-existing `.json` SBOMs directly to analyze them.
  - **Rust & Go**: `Cargo.toml`, `go.mod`
- **📥 Audit-Ready CycloneDX v1.5 JSON Export**
  - Generates official specification-compliant CycloneDX v1.5 JSON with components, purls, licenses, and vulnerability ratings.
- **📄 Print-to-PDF Executive Audit Report**
  - Print-friendly layout that strips animations and dark themes for instant PDF export.
- **🎨 Cyberpunk Aesthetic & UI Interactions**
  - 3D rotating globe background (Vanta.js WebGL).
  - Custom glowing cyan mouse cursor with smooth-trailing ring and click ripple effects.
  - Viewport scroll reveal animations.
  - Simulated authentication workflow with email/password and Google login.

---

## 📂 Project Structure

```text
sbom-tool/
├── app.py                   # Flask backend & API routing
├── requirements.txt         # Python dependencies
├── templates/
│   ├── login.html           # 3D animated Sign-In page
│   └── index.html           # Main SBOM Guardian dashboard
├── static/
│   ├── style.css            # Cyberpunk design system & media print styles
│   ├── script.js            # 3D WebGL graph, D3.js fallback, and API ingestion
│   ├── matrix.js            # Digital rain canvas module
│   ├── cursor.js            # Custom glowing cursor & click ripples
│   └── vanta-init.js        # Vanta 3D globe initialization
├── sample_requirements.txt  # Sample Python test manifest
├── test_node_app.json       # Sample Node.js test manifest
├── test_python_app.txt      # Secondary Python test manifest
├── .gitignore               # Git exclusion rules
├── LICENSE                  # MIT License
├── CONTRIBUTING.md          # Contribution guidelines
├── SECURITY.md              # Security policy
└── README.md                # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.8 or higher
- `pip` (Python package manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/sbom-guardian.git
   cd sbom-guardian
   ```

2. **Create and activate a virtual environment (recommended):**
   ```bash
   # On Windows
   python -m venv venv
   .\venv\Scripts\activate

   # On macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch the application:**
   ```bash
   python app.py
   ```

5. **Open in browser:**
   Navigate to [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🧪 Testing with Sample Files

The repository includes sample manifests to test the application immediately:
1. **Python Manifest**: Drag and drop `sample_requirements.txt` onto the dropzone.
2. **Node.js Manifest**: Drag and drop `test_node_app.json` onto the dropzone.
3. **1-Click Demo Presets**: Click **Python E-Commerce** or **Node.js Gateway** on the dashboard for instant live analysis.

---

## 🔒 Security & Privacy

SBOM Guardian performs vulnerability queries by sending package names and version strings to public vulnerability databases (Google OSV). No proprietary source code or confidential credentials are ever transmitted.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

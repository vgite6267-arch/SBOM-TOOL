# 🛡️ SBOM Guardian

**3D Cyber Software Bill of Materials (SBOM) & Security Intelligence**

SBOM Guardian is an advanced, interactive security tool designed to ingest software manifests, visualize dependencies in a fully interactive 3D WebGL environment, and identify critical vulnerabilities in real-time. 

## ✨ Key Features

* **True 3D Dependency Graph:** Built with Three.js and `3d-force-graph` to visualize complex software ecosystems.
* **Real-time Threat Detection:** Automatically flags `HIGH` and `CRITICAL` vulnerabilities with pulsing 3D wireframe halos.
* **Interactive 2D Fallback:** Seamlessly toggle to a high-contrast D3.js 2D map for cleaner, high-level presentations.
* **Cyber Inspector Panel:** Click any component to instantly view its version, license, and recommended remediation steps.
* **CycloneDX Export:** Generate and download standard CycloneDX JSON SBOM reports with a single click.
* **Demo Presets:** Built-in 1-click ingestions for Python and Node.js environments to easily demonstrate functionality.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism UI), Vanilla JavaScript
* **Visual Engines:** Three.js, 3d-force-graph (WebGL), D3.js (2D Force)
* **Backend:** Python, Flask
* **Data Processing:** Native Python JSON and Regex parsers

## 🚀 How to Run Locally

### Prerequisites
Make sure you have Python installed on your machine.

### Installation Steps

1. **Clone the repository** (or download the project folder).
2. **Navigate to the project directory** in your terminal:
   ```bash
   cd sbom-tool
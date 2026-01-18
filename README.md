# Home Server Dashboard

A comprehensive, self-hosted dashboard for managing and monitoring home server infrastructure. This application serves as a central hub for hosted apps, services, and hardware metrics, providing a unified view of your homelab.

## 🚀 Features

### Core Functionality
*   **Service Management:** Add, edit, and organize services with custom icons and status monitoring (Ping/Health Checks).
*   **Quick Access:** Pin frequently used services to the top of the dashboard.
*   **Group & Hierarchy:** Organize services into nested groups (e.g., "Media," "Automation," "Critical Infrastructure").
*   **Search & Filter:** Global search bar (Name, URL, IP) and filtering logic.

### Advanced Monitoring
*   **Proxmox Integration:** Monitor Nodes, VMs, and LXC containers directly via the Proxmox API.
*   **Glances Integration:** Real-time system and Docker container stats.
*   **TrueNAS Integration:** View storage pool health and usage.
*   **SNMP Support:** Retrieve remote statistics from compatible devices.
*   **Uptime History:** Track service availability with historical graphs and sparklines.

### Visualization & UX
*   **Infrastructure Graph:** Interactive topology view with nested zones and floating info cards.
*   **Modern UI:** Dark theme, glassmorphism design, and responsive layout.
*   **Customization:** Brand icons (Simple Icons integration) and flexible network settings (separate Display vs. Monitoring URLs).

## 🛠️ Tech Stack

*   **Frontend:** React (Vite), CSS Modules, Lucide React Icons.
*   **Backend:** Node.js, Express.js.
*   **Database:** PostgreSQL.
*   **Containerization:** Docker & Docker Compose.

## 📦 Prerequisites

*   [Docker](https://www.docker.com/) installed.
*   [Docker Compose](https://docs.docker.com/compose/) installed.

## 🏁 Getting Started

### Development Environment

To run the application in development mode with hot-reloading:

1.  Clone the repository.
2.  Create a `.env` file in the root directory (optional, see Configuration).
3.  Run the stack:

```bash
docker-compose up --build
```

- **Client:** [http://localhost:5173](http://localhost:5173)
- **API:** [http://localhost:5000](http://localhost:5000)

### Production Deployment

To deploy the optimized production build:

1.  Ensure you have the `docker-compose.prod.yml` file.
2.  Run the production stack:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

- **Dashboard:** [http://localhost:8080](http://localhost:8080)

## ⚙️ Configuration

Create a `.env` file in the root directory to configure sensitive credentials and environment variables.

**Example `.env`:**

```env
POSTGRES_USER=user
POSTGRES_PASSWORD=password
POSTGRES_DB=dashboard_db
# Add other API keys or service credentials here as needed by the backend
```

## 🗺️ Project Structure

*   **`/client`**: React frontend application.
*   **`/server`**: Node.js/Express backend API.
*   **`/docker-compose.yml`**: Development container orchestration.
*   **`/docker-compose.prod.yml`**: Production container orchestration.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

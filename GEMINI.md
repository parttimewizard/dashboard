# Project Context: dashboard

## Overview
This a project aims to create a web app that will serve as a dashboard for my homeserver. It will serve as the one location I go to for anything related to my hosted apps or to review my configurations. 

## Current Status
**Current Phase:** Complete (Phase 9 Done)

## Development Plan

### Phase 1: Foundation & Infrastructure (Immediate)
*   [x] Initialize `server` directory (Express.js).
*   [x] Create `docker-compose.yml` (Client, Server, DB).
*   [x] Establish DB connection.
*   [x] Verify full stack connectivity.

### Phase 2: Backend Core & Database
*   [x] DB Schema Design (`services` table).
*   [x] API CRUD endpoints for Services.
*   [x] Service Status Monitoring (ping/health check).

### Phase 3: Frontend - Dashboard & Visualization
*   [x] UI Layout (Sidebar/Nav, Dashboard).
*   [x] Quick Access Section.
*   [x] Grouped View (Media, Automation, etc.).
*   [x] Service Cards with status indicators.

### Phase 4: Frontend - Administration
*   [x] Add/Edit Service Forms.
*   [x] Service Management (Delete, Reorder).

### Phase 5: Polish & Deployment
*   [x] Styling & Responsive Design.
*   [x] Production Docker Build (`docker-compose.prod.yml`).

### Phase 6: Advanced Features (Groups & SNMP)
*   [x] DB Refactor: Hierarchical Groups (`groups` table).
*   [x] DB Refactor: SNMP Support (`services` columns).
*   [x] Backend: Group CRUD & Nested Pinger.
*   [x] Backend: SNMP Monitoring Implementation.
*   [x] Frontend: Nested Group Display.
*   [x] Frontend: Advanced Service Form (Groups, SNMP).

### Phase 7: UI/UX Refinement
*   [x] Visual Polish: Modern Dark Theme & Glassmorphism.
*   [x] Icons: Integrate `lucide-react`.
*   [x] Animations: Pulse effects for status, smooth transitions.
*   [x] UX: Better spacing for nested groups.
*   [x] UX: Logical view sidebar for group navigation.

### Phase 8: Advanced Monitoring (Proxmox, Glances & TrueNAS)
*   [x] DB Refactor: Add columns for API credentials and monitoring settings.
*   [x] Backend: Proxmox API Integration (Node/VM/LXC status & stats).
*   [x] Backend: Glances API Integration (System & Docker stats).
*   [x] Backend: TrueNAS API Integration (Pool health & usage).
*   [x] Backend: Improved SSL/TLS handling for self-signed certificates.
*   [x] Frontend: "Test Connection" feature in service modal with real-time logs.
*   [x] Frontend: Enhanced Service Cards with CPU cores, RAM usage/total, and Disk usage bars.

### Phase 9: Visual & UX Enhancements
*   [x] Brand Icon Library: Integrated Simple Icons for app logos.
*   [x] Dual-Icon Support: Main brand icon with generic type badge.
*   [x] Topology Enhancements: Floating info cards on hover in Graph View.
*   [x] Infrastructure Stacking: Fixed Z-index issues in Topology view using state-managed layering.
*   [x] Network Flexibility: Support for separate Display vs. Monitoring/API URLs.

### Phase 10: Search & Filtering
*   [x] Frontend: Global Search Bar (Name, URL, IP).
*   [x] Frontend: Filter logic for Services and Groups.

### Phase 11: Uptime History & Analytics
*   [x] Database: `service_history` table.
*   [x] Backend: Record ping results history.
*   [x] Frontend: Uptime graphs/sparklines on service cards.

### Phase 12: Data Management
*   [x] Backend: Export/Import endpoints.
*   [x] Frontend: Settings page for Backup/Restore.

### Phase 13: Multi-Group Support (Many-to-Many)
*   [x] Database: `service_groups` join table.
*   [x] Backend: Updated CRUD to handle multiple groups.
*   [x] Frontend: Multi-select UI for Service Groups.
*   [x] Frontend: Update hierarchy to render services in multiple groups.

### Phase 14: Locations & Spatial Grouping
*   [x] Database: `locations` table (Hierarchical).
*   [x] Backend: Locations CRUD & Service `location_id`.
*   [x] Frontend: Locations Management Sidebar.
*   [x] Frontend: Visual Grouping in Infrastructure Graph (Nested Zones).
*   [x] Frontend: Service "Location" configuration.

## How to Run

### Development
```bash
docker-compose up --build
```
Access Client: `http://localhost:5173`
Access API: `http://localhost:5000`

### Production
```bash
docker-compose -f docker-compose.prod.yml up --build -d
```
Access Dashboard: `http://localhost:8080`

### Docker Hub Deployment

1.  **Build & Push Images (Local Machine):**
    Set your Docker Hub username and build/push using the builder config.
    ```bash
    export DOCKER_USER=your_username
    docker-compose -f docker-compose.builder.yml build
    docker-compose -f docker-compose.builder.yml push
    ```

2.  **Deploy on Server:**
    - Copy `docker-compose.prod.yml` to your server.
    - Create a `.env` file next to it with your configuration (or export variables):
      ```bash
      DOCKER_USER=your_username
      POSTGRES_PASSWORD=your_secure_password
      ```
    - Start the application:
      ```bash
      docker-compose -f docker-compose.prod.yml up -d
      ```

## stack specifications
 - node.js for the backend, 
 - postgresql for the database
 - express
 - react for the frontend
The app should use plain JS (no typescript)
 - docker to deploy the app.

## Home server architecture 
  the architecture is used as a guidline to know what features to add and how to add them, how to access the apps and information about them. 

### Proxmox 192.168.0.60 
  #### VM 192.168.0.62
  *   TrueNas 

### Proxmox 192.168.0.101
  #### VM 192.168.0.66
  *   **Media Center**: Jellyfin (`:8096`
  *   **Downloaders**: qBittorrent (`:8080`), NZBGet
  *   **Automation**: Sonarr, Radarr, Lidarr, Bazarr
  *   **Indexer Management**: Prowlarr (`:9696`)
  *   **Knowledge/Notes**: Obsidian (Web desktop), Silverbullet
  *   **Photos**: Immich (`:2283`)
  *   **Utilities**: Syncthing, Filebrowser, Copyparty
  #### LXC 192.168.0.68
  *   Ansible

### Proxmox 192.168.0.100
  #### VM 192.168.0.70
  *   Wireguard
  *   cloudflare ddns
  *   authentik
  *   vaultwarden
  *   pihole
  *   portainer

## General specifications
  - The app should have the ability to display a number of apps / service, with the ability to group them according to the type or to the importance. as well as having a quick access area for most used services / apps. 
  - The app should have an interface and a mechanism to add new services where all the needed information to distinguish the service and to communicate with it (information about up time and status as well as statistics) are entered. 
  - The app should have a clean and modern interface with a snappy performance. 
  ### Specifications Update:
    - I want the ability to add groups and sub-groups, for instance I can create a new one called "Host" with type Hypervisor -> proxmox then with the name critical services. the other services and apps can be asigned to that group later on, this way I will have my setup segmented and organized. 
    - I would like to also have the ability to comunicate with a machine or service and get data, statistics like using SNMP for remote monitoring. 
    - I want to monitor my VMs via Proxmox API and my containers/services via Glances.

## Maintenance
As the project grows, this `GEMINI.md` file should be updated to reflect the actual architecture, build commands, and development conventions of the implemented solution.
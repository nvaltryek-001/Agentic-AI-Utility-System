# Fault Management System

<cite>
**Referenced Files in This Document**
- [server.js](file://backend/src/server.js)
- [faultController.js](file://backend/src/controllers/faultController.js)
- [Fault.js](file://backend/src/models/Fault.js)
- [faultRoutes.js](file://backend/src/routes/faultRoutes.js)
- [faultAnalysisAgent.js](file://backend/src/agents/faultAnalysisAgent.js)
- [priorityDecisionAgent.js](file://backend/src/agents/priorityDecisionAgent.js)
- [assignmentAgent.js](file://backend/src/agents/assignmentAgent.js)
- [reschedulerAgent.js](file://backend/src/agents/reschedulerAgent.js)
- [learningAgent.js](file://backend/src/agents/learningAgent.js)
- [notifier.js](file://backend/src/utils/notifier.js)
- [User.js](file://backend/src/models/User.js)
- [aiService.js](file://backend/src/services/aiService.js)
- [ReportFault.jsx](file://frontend/src/pages/ReportFault.jsx)
- [Dashboard.jsx](file://frontend/src/pages/Dashboard.jsx)
- [App.jsx](file://frontend/src/App.jsx)
- [docker-compose.yml](file://docker-compose.yml)
- [backend/package.json](file://backend/package.json)
- [frontend/package.json](file://frontend/package.json)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [AI Agents and Decision Making](#ai-agents-and-decision-making)
5. [Real-time Communication](#real-time-communication)
6. [Data Model](#data-model)
7. [Frontend Integration](#frontend-integration)
8. [Deployment Architecture](#deployment-architecture)
9. [Operational Workflows](#operational-workflows)
10. [Performance Considerations](#performance-considerations)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Conclusion](#conclusion)

## Introduction

The Fault Management System is an intelligent, agentic AI-powered platform designed to streamline utility fault reporting, analysis, and resolution. Built with modern technologies including React, Node.js, MongoDB, and Socket.io, the system provides real-time fault tracking, automated priority assessment, intelligent technician assignment, and continuous learning capabilities.

The system operates on a multi-agent architecture where specialized AI agents handle different aspects of fault management, from initial analysis to ongoing optimization. It supports three distinct user roles: citizens who report faults, technicians who resolve them, and administrators who oversee operations.

## System Architecture

The Fault Management System follows a microservices-like architecture with clear separation of concerns across frontend, backend, AI services, and database layers.

```mermaid
graph TB
subgraph "Frontend Layer"
Citizen[Citizen App]
Tech[Technician App]
Admin[Admin Dashboard]
end
subgraph "Backend Layer"
API[Express API Server]
Socket[Socket.io Server]
Controllers[Controllers]
Services[Services]
Utils[Utilities]
end
subgraph "AI Layer"
FA[Fault Analysis Agent]
PD[Priotiy Decision Agent]
AS[Assignment Agent]
RA[Rescheduler Agent]
LA[Learning Agent]
end
subgraph "Data Layer"
MongoDB[(MongoDB)]
FaultModel[Fault Model]
UserModel[User Model]
NotificationModel[Notification Model]
end
subgraph "External Services"
AIService[AI Prediction Service]
end
Citizen --> API
Tech --> API
Admin --> API
API --> Controllers
Controllers --> FA
Controllers --> PD
Controllers --> AS
Controllers --> RA
Controllers --> LA
Controllers --> Services
Controllers --> Utils
FA --> AIService
PD --> MongoDB
AS --> MongoDB
RA --> MongoDB
LA --> MongoDB
Controllers --> Socket
Socket --> Citizen
Socket --> Tech
Socket --> Admin
Controllers --> MongoDB
Services --> AIService
```

**Diagram sources**
- [server.js:1-74](file://backend/src/server.js#L1-L74)
- [faultController.js:1-449](file://backend/src/controllers/faultController.js#L1-L449)
- [docker-compose.yml:1-42](file://docker-compose.yml#L1-L42)

**Section sources**
- [server.js:1-74](file://backend/src/server.js#L1-L74)
- [docker-compose.yml:1-42](file://docker-compose.yml#L1-L42)

## Core Components

### Backend Server Infrastructure

The backend server serves as the central orchestrator, managing HTTP requests, WebSocket connections, and coordinating between different system components.

```mermaid
sequenceDiagram
participant Client as "Client Application"
participant Server as "Express Server"
participant Socket as "Socket.io"
participant DB as "MongoDB"
Client->>Server : HTTP Request
Server->>DB : Database Operation
DB-->>Server : Data Response
Server-->>Client : HTTP Response
Client->>Socket : WebSocket Connection
Socket->>Socket : Handle Events
Socket-->>Client : Real-time Updates
```

**Diagram sources**
- [server.js:17-74](file://backend/src/server.js#L17-L74)

### Controller Layer

The controller layer implements the primary business logic for fault management operations, coordinating between agents and database operations.

**Section sources**
- [server.js:1-74](file://backend/src/server.js#L1-L74)
- [faultController.js:1-449](file://backend/src/controllers/faultController.js#L1-L449)

## AI Agents and Decision Making

The system employs five specialized AI agents that work together to provide intelligent fault management capabilities.

### Fault Analysis Agent

The Fault Analysis Agent performs comprehensive analysis of reported faults using natural language processing and location-based intelligence.

```mermaid
flowchart TD
Input[Raw Fault Report] --> TextAnalysis[Text Analysis]
Input --> LocationAnalysis[Location Analysis]
Input --> ImageAnalysis[Image Analysis]
TextAnalysis --> CategoryDetection[Category Detection]
TextAnalysis --> SeverityAssessment[Severity Assessment]
LocationAnalysis --> DensityCalculation[Population Density]
LocationAnalysis --> GeographicContext[Geographic Context]
ImageAnalysis --> MLClassification[ML Classification]
ImageAnalysis --> HumanReview[Human Review Required]
CategoryDetection --> ConfidenceScore[Confidence Score]
SeverityAssessment --> ConfidenceScore
DensityCalculation --> ConfidenceScore
GeographicContext --> ConfidenceScore
MLClassification --> ConfidenceScore
HumanReview --> ConfidenceScore
ConfidenceScore --> Output[Structured Analysis]
```

**Diagram sources**
- [faultAnalysisAgent.js:32-89](file://backend/src/agents/faultAnalysisAgent.js#L32-L89)

### Priority Decision Agent

The Priority Decision Agent calculates urgency scores based on multiple factors including severity, category, population density, and temporal factors.

```mermaid
flowchart TD
FaultData[Fault Data] --> SeverityFactor[Severity Factor]
FaultData --> CategoryFactor[Category Factor]
FaultData --> DensityFactor[Population Density Factor]
FaultData --> HistoricalFactor[Historical Pattern Factor]
FaultData --> TimeFactor[Time of Day Factor]
SeverityFactor --> BaseScore[Base Score Calculation]
CategoryFactor --> BaseScore
DensityFactor --> BaseScore
HistoricalFactor --> BaseScore
TimeFactor --> BaseScore
BaseScore --> PriorityLevel[Priority Level]
BaseScore --> ResolutionTime[Estimated Resolution Time]
PriorityLevel --> FinalOutput[Priority Score]
ResolutionTime --> FinalOutput
```

**Diagram sources**
- [priorityDecisionAgent.js:37-111](file://backend/src/agents/priorityDecisionAgent.js#L37-L111)

### Assignment Agent

The Assignment Agent intelligently matches technicians to faults based on proximity, skills, workload, and performance metrics.

```mermaid
flowchart TD
Fault[Fault Request] --> TechnicianPool[Available Technicians]
TechnicianPool --> DistanceCalc[Distance Calculation]
TechnicianPool --> SkillMatch[Skill Matching]
TechnicianPool --> WorkloadScore[Workload Assessment]
TechnicianPool --> RatingScore[Ratings Analysis]
DistanceCalc --> CombinedScore[Combined Scoring]
SkillMatch --> CombinedScore
WorkloadScore --> CombinedScore
RatingScore --> CombinedScore
CombinedScore --> BestMatch[Best Technician]
BestMatch --> ETA[ETA Calculation]
ETA --> Assignment[Final Assignment]
```

**Diagram sources**
- [assignmentAgent.js:127-190](file://backend/src/agents/assignmentAgent.js#L127-L190)

### Rescheduler Agent

The Rescheduler Agent handles dynamic reassignment scenarios including technician rejection, delays, and capacity constraints.

```mermaid
flowchart TD
Event[Fault Event] --> Rejection{Technician Rejection?}
Event --> Delay{Delay Detected?}
Event --> Capacity{Capacity Issues?}
Rejection --> |Yes| HandleRejection[Handle Rejection]
Delay --> |Yes| HandleDelay[Handle Delay]
Capacity --> |Yes| HandleCapacity[Handle Capacity]
HandleRejection --> FindAlternative[Find Alternative]
HandleDelay --> CheckBackup[Check Backup]
HandleCapacity --> OptimizeLoad[Optimize Load]
FindAlternative --> Reassign[Reassign Fault]
CheckBackup --> |Nearby Available| Reassign
CheckBackup --> |None Available| Escalate[Escalate Issue]
OptimizeLoad --> Redistribute[Redistribute Load]
Reassign --> Notify[Notify Parties]
Escalate --> AdminAlert[Admin Alert]
Redistribute --> Notify
```

**Diagram sources**
- [reschedulerAgent.js:27-112](file://backend/src/agents/reschedulerAgent.js#L27-L112)

### Learning Agent

The Learning Agent continuously improves system performance through machine learning from historical data and operational insights.

```mermaid
flowchart TD
Repair[Completed Repair] --> ExtractData[Extract Data]
ExtractData --> UpdatePatterns[Update Patterns]
ExtractData --> UpdatePerformance[Update Performance]
ExtractData --> UpdateAreas[Update Area Patterns]
UpdatePatterns --> CategoryPatterns[Category Patterns]
UpdatePerformance --> TechnicianPerformance[Technician Performance]
UpdateAreas --> AreaRisk[Area Risk Scores]
CategoryPatterns --> Predictions[Predictions]
TechnicianPerformance --> Recommendations[Recommendations]
AreaRisk --> PredictiveMaintenance[Predictive Maintenance]
Predictions --> ImproveQuality[Improve Quality]
Recommendations --> BetterMatching[Better Matching]
PredictiveMaintenance --> PreventiveActions[Preventive Actions]
ImproveQuality --> LearningLoop[Learning Loop]
BetterMatching --> LearningLoop
PreventiveActions --> LearningLoop
```

**Diagram sources**
- [learningAgent.js:26-59](file://backend/src/agents/learningAgent.js#L26-L59)

**Section sources**
- [faultAnalysisAgent.js:1-149](file://backend/src/agents/faultAnalysisAgent.js#L1-L149)
- [priorityDecisionAgent.js:1-177](file://backend/src/agents/priorityDecisionAgent.js#L1-L177)
- [assignmentAgent.js:1-258](file://backend/src/agents/assignmentAgent.js#L1-L258)
- [reschedulerAgent.js:1-304](file://backend/src/agents/reschedulerAgent.js#L1-L304)
- [learningAgent.js:1-396](file://backend/src/agents/learningAgent.js#L1-L396)

## Real-time Communication

The system utilizes Socket.io for real-time bidirectional communication between clients and the server.

```mermaid
sequenceDiagram
participant Citizen as "Citizen Client"
participant Tech as "Technician Client"
participant Admin as "Admin Client"
participant Server as "Socket Server"
participant DB as "Database"
Note over Server : User Connection
Server->>Server : Create User Room
Server->>Citizen : Connection Established
Note over Server : Fault Reporting
Citizen->>Server : Report Fault
Server->>DB : Store Fault
Server->>Server : Broadcast to Rooms
Server-->>Citizen : Confirmation
Server-->>Tech : New Fault Alert
Server-->>Admin : System Alert
Note over Server : Status Updates
Tech->>Server : Update Status
Server->>DB : Update Fault Status
Server->>Citizen : Status Notification
Server->>Admin : Dashboard Update
Note over Server : Location Sharing
Tech->>Server : Share Location
Server->>Citizen : Nearby Faults
Server->>Admin : Monitoring Dashboard
```

**Diagram sources**
- [server.js:27-44](file://backend/src/server.js#L27-L44)

**Section sources**
- [server.js:1-74](file://backend/src/server.js#L1-L74)

## Data Model

The system uses MongoDB with Mongoose for data persistence, implementing a comprehensive schema for fault management.

```mermaid
erDiagram
FAULT {
string type
object location
string severity
number confidenceScore
string aiCategory
number priorityScore
string status
object assignedTo
date assignedAt
date eta
date acceptedAt
date startedAt
date completedAt
object resolution
array images
number populationDensity
number similarFaultsCount
number reassignmentCount
string reassignmentReason
object citizenFeedback
}
USER {
string name
string email
string password
string role
string phone
array skills
object location
boolean isAvailable
number currentWorkload
number rating
number totalCompleted
}
NOTIFICATION {
object recipient
string type
string title
string message
object faultId
array sentVia
boolean isRead
date createdAt
}
FAULT ||--|| USER : "assignedTo"
FAULT ||--|| NOTIFICATION : "related_to"
USER ||--o{ NOTIFICATION : "receives"
```

**Diagram sources**
- [Fault.js:3-75](file://backend/src/models/Fault.js#L3-L75)
- [User.js:4-37](file://backend/src/models/User.js#L4-L37)

**Section sources**
- [Fault.js:1-75](file://backend/src/models/Fault.js#L1-L75)
- [User.js:1-37](file://backend/src/models/User.js#L1-L37)

## Frontend Integration

The frontend application provides role-specific interfaces for citizens, technicians, and administrators.

### Citizen Interface

The citizen interface focuses on fault reporting with intuitive forms and location detection capabilities.

```mermaid
flowchart TD
Home[Home Page] --> Report[Report Fault Form]
Report --> Location[Location Detection]
Report --> Description[Issue Description]
Report --> Photo[Photo Upload]
Report --> Submit[Submit Report]
Location --> AutoDetect[Automatic Detection]
Location --> ManualEnter[Manual Entry]
Submit --> Success[Success Message]
Success --> Dashboard[Dashboard Redirect]
Dashboard --> RealTime[Real-time Updates]
RealTime --> StatusTracking[Status Tracking]
StatusTracking --> Notifications[Notifications]
```

**Diagram sources**
- [ReportFault.jsx:16-86](file://frontend/src/pages/ReportFault.jsx#L16-L86)

### Technician Interface

The technician interface provides fault assignment management, acceptance/rejection workflows, and status updates.

### Admin Interface

The admin interface offers comprehensive oversight including system monitoring, user management, and performance analytics.

**Section sources**
- [ReportFault.jsx:1-309](file://frontend/src/pages/ReportFault.jsx#L1-L309)
- [Dashboard.jsx:1-133](file://frontend/src/pages/Dashboard.jsx#L1-L133)
- [App.jsx:1-170](file://frontend/src/App.jsx#L1-L170)

## Deployment Architecture

The system uses Docker Compose for containerized deployment, enabling easy scaling and management.

```mermaid
graph TB
subgraph "Docker Network"
subgraph "MongoDB Container"
Mongo[mongo:7]
MongoVol[mongo_data Volume]
end
subgraph "AI Service Container"
AIService[ai-service:latest]
AIContainer[Container:8000]
end
subgraph "Backend Container"
Backend[backend:latest]
BackendEnv[Environment Variables]
BackendPort[5000:5000]
end
subgraph "Frontend Container"
Frontend[frontend:latest]
FrontendPort[3000:80]
end
end
Mongo --- MongoVol
AIService --- AIContainer
Backend --- BackendEnv
Backend --- BackendPort
Frontend --- FrontendPort
Backend --> Mongo
Backend --> AIService
Frontend --> Backend
```

**Diagram sources**
- [docker-compose.yml:3-42](file://docker-compose.yml#L3-L42)

**Section sources**
- [docker-compose.yml:1-42](file://docker-compose.yml#L1-L42)

## Operational Workflows

### Fault Reporting Workflow

The fault reporting process integrates multiple AI agents and real-time communication systems.

```mermaid
sequenceDiagram
participant Citizen as "Citizen"
participant API as "API Server"
participant FA as "Fault Analysis"
participant PD as "Priority Decision"
participant AS as "Assignment"
participant RA as "Rescheduler"
participant LA as "Learning"
participant Socket as "Socket.io"
Citizen->>API : Report Fault
API->>FA : Analyze Fault Data
FA-->>API : Structured Analysis
API->>PD : Calculate Priority
PD-->>API : Priority Score
API->>AS : Find Best Technician
AS-->>API : Technician Assignment
API->>LA : Record Learning Data
LA-->>API : Learning Insights
API->>Socket : Broadcast Updates
Socket-->>Citizen : Real-time Notification
Socket-->>Technician : Assignment Alert
Socket-->>Admin : System Alert
```

**Diagram sources**
- [faultController.js:15-125](file://backend/src/controllers/faultController.js#L15-L125)

### Technician Assignment Process

The assignment process considers multiple factors to optimize technician-fault matching.

```mermaid
flowchart TD
NewFault[New Fault] --> AvailableTech[Available Technicians]
AvailableTech --> Distance[Distance Score]
AvailableTech --> Skills[Skills Match]
AvailableTech --> Workload[Workload Score]
AvailableTech --> Rating[Ratings Score]
Distance --> Combined[Combined Score]
Skills --> Combined
Workload --> Combined
Rating --> Combined
Combined --> Threshold{Score > 20?}
Threshold --> |Yes| Assign[Assign Technician]
Threshold --> |No| Hold[Put on Hold]
Assign --> Notify[Send Notifications]
Hold --> Escalate[Escalate to Admin]
Notify --> UpdateDB[Update Database]
Escalate --> UpdateDB
UpdateDB --> Monitor[Monitor Resolution]
```

**Diagram sources**
- [assignmentAgent.js:127-190](file://backend/src/agents/assignmentAgent.js#L127-L190)

**Section sources**
- [faultController.js:1-449](file://backend/src/controllers/faultController.js#L1-L449)
- [assignmentAgent.js:1-258](file://backend/src/agents/assignmentAgent.js#L1-L258)

## Performance Considerations

### Database Optimization

The system implements strategic indexing and query optimization for optimal performance:

- **Compound Indexes**: Multi-field indexes for common query patterns
- **Geospatial Indexing**: 2dsphere index for location-based queries
- **Text Search**: Full-text search capabilities for fault descriptions
- **Caching Strategy**: In-memory caching for frequently accessed data

### Scalability Features

- **Horizontal Scaling**: Stateless architecture supporting load balancing
- **Connection Pooling**: Optimized database connection management
- **Message Queuing**: Asynchronous processing for heavy operations
- **CDN Integration**: Static asset delivery optimization

### Real-time Performance

- **WebSocket Optimization**: Efficient event broadcasting
- **Connection Management**: Automatic cleanup of inactive connections
- **Load Balancing**: Round-robin distribution across instances
- **Heartbeat Mechanisms**: Connection health monitoring

## Troubleshooting Guide

### Common Issues and Solutions

**Database Connection Problems**
- Verify MongoDB URI configuration
- Check network connectivity between containers
- Monitor connection pool exhaustion
- Validate authentication credentials

**AI Service Integration Issues**
- Confirm AI service availability on port 8000
- Check model loading and initialization
- Monitor prediction accuracy metrics
- Validate input data formatting

**Socket.io Connection Failures**
- Verify CORS configuration
- Check firewall settings for port 5000
- Monitor connection limits
- Validate client-side connection handling

**Performance Degradation**
- Analyze query performance with explain plans
- Monitor memory usage and garbage collection
- Check for blocking operations
- Review indexing effectiveness

### Monitoring and Logging

The system implements comprehensive logging for operational visibility:

- **Request Tracing**: End-to-end request tracking
- **Error Analytics**: Aggregated error reporting
- **Performance Metrics**: Response time and throughput monitoring
- **User Activity Logs**: Audit trails for compliance

**Section sources**
- [server.js:1-74](file://backend/src/server.js#L1-L74)
- [docker-compose.yml:1-42](file://docker-compose.yml#L1-L42)

## Conclusion

The Fault Management System represents a comprehensive solution for intelligent utility fault handling, combining modern web technologies with advanced AI capabilities. The system's modular architecture enables scalability, maintainability, and continuous improvement through machine learning.

Key strengths include:
- **Intelligent Automation**: Multi-agent AI system for autonomous decision making
- **Real-time Operations**: Live updates and notifications for all stakeholders
- **Continuous Learning**: Adaptive system that improves over time
- **Scalable Architecture**: Containerized deployment supporting growth
- **User-Centric Design**: Role-specific interfaces optimized for different user needs

The system provides a robust foundation for utility management operations, with clear pathways for extension and customization based on specific operational requirements.
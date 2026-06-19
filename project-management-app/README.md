# Tasky app

A comprehensive demonstration application showcasing the capabilities of the Drumr framework for building enterprise-grade project and task management systems.

## Features

This demo app demonstrates:

### Data Models

- **User Model**: Multi-role user management (System, Admin, Manager, Developer)
- **Project Model**: Complete project tracking with various field types:
  - Text fields with validation
  - Choice/Enum fields (status, priority)
  - Date/Time fields
  - Money and Decimal fields
  - Boolean fields
  - Reference fields for relationships
- **Task Model**: Comprehensive task management with:
  - Project associations
  - User assignments
  - Status tracking
  - Time estimation and tracking
  - Tags and categorization

### Actions

- **Task Actions**:
  - `CompleteTask`: Mark tasks as completed with notes
  - `AssignTask`: Assign tasks to users
  - `StartTask`: Begin work on tasks
- **Project Actions**:
  - `UpdateProjectStatus`: Change project status with validation

### Permissions

- **Role-based Access Control** using CASL:
  - System: Full access
  - Admin: Manage all resources
  - Manager: Manage their own projects and tasks
  - Developer: Work on assigned tasks

### API

- GraphQL API with full CRUD operations
- Authentication endpoints
- Type-safe operations

## Prerequisites

- Node.js 20+
- Docker and Docker Compose (for PostgreSQL)
- Drumr CLI (`npm install -g @drumr/cli`)

## Installation

1. **Navigate to the app directory**:

   ```bash
   cd apps/project-management-app
   ```

2. **Run the setup and build commands** (installs dependencies, generates schema & SDK, and builds):

   ```bash
   drumr setup
   drumr build   # recommended: re-runs sync-metadata to resolve any missing generated files
   ```

3. **Load sample data**:

   Start the app once so the database and schema are created automatically:

   ```bash
   drumr run
   ```

   Once the app is running and you see it is ready, stop it (Ctrl+C) and load the sample data:

   ```bash
   drumr ds mainDs load
   ```

   Then start the app again normally.


## Running the App

### Using Drumr CLI (Recommended)

From the app directory:

```bash
# Development mode with hot-reload
drumr run
```

This will:

1. Start the PostgreSQL database (if not running)
2. Start the backend server
3. Start the frontend development server
4. Open the app at http://localhost:8000

### Manual Setup

If you prefer to run components separately:

1. **Start the database**:

   ```bash
   docker compose up -d
   ```

2. **Start the backend** (in one terminal):

   ```bash
   drumr run --backend --skip-infra
   ```

3. **Start the frontend** (in a new terminal):

   ```bash
   drumr run --ui-only
   ```

## Database Management

### Initial Setup

The database schema is created automatically on first startup — no manual setup needed. Just run:

```bash
drumr run
```

This starts Docker (if not running), creates the PostgreSQL container, and synchronizes the schema automatically when the backend initializes.

Once the app is ready, stop it and load the sample data:

```bash
drumr ds mainDs load
```

### Resetting the Database

To drop all data and start fresh:

```bash
drumr ds mainDs reset
```

Then start the app again to recreate the schema, and reload data if needed:

```bash
drumr run   # recreates the schema
# stop with Ctrl+C, then:
drumr ds mainDs load
```

### Manual Data Loading

You can load specific models or exclude others:

```bash
# Load all sample data
drumr ds mainDs load

# Load only specific models
drumr ds mainDs load --includeModels=User,Project

# Load everything except test data
drumr ds mainDs load --excludeModels=TestData
```

**Note:** The `ds load` command handles foreign key ordering automatically. If you encounter constraint errors on a fresh database, make sure the app has started at least once so the schema exists.

## Default Users

The app comes with pre-configured users for testing:

| Email                       | Password    | Role      | Description           |
| --------------------------- | ----------- | --------- | --------------------- |
| admin@projectmanagement.com | password123 | System    | Full system access    |
| admin@company.com           | password123 | Admin     | Administrative access |
| manager1@company.com        | password123 | Manager   | Project management    |
| manager2@company.com        | password123 | Manager   | Project management    |
| dev1@company.com            | password123 | Developer | Development work      |
| dev2@company.com            | password123 | Developer | Development work      |
| dev3@company.com            | password123 | Developer | Development work      |

**Note**: All passwords are hashed in the dataset files. Use `password123` to login to any test account.

## Sample Data

The app includes sample data for demonstration:

- **7 Users**: System admin, company admin, 2 managers, 3 developers
- **4 Projects**: Website Redesign, Mobile App Development, API Integration, Database Migration
- **10 Tasks**: Distributed across projects with various statuses, priorities, and assignments

All sample data is located in `backend/src/dataSets/mainDs/default/` as JSONL files.

## API Endpoints

### Authentication

- `POST /auth/login` - Login with email and password
- `POST /auth/logout` - Logout current session
- `GET /auth/me` - Get current user information

### GraphQL

- `http://localhost:3000/graphql` - GraphQL Playground (development only)

### Frontend UI

- `http://localhost:3000/` - Welcome page
- `http://localhost:3000/projects` - Projects management
- `http://localhost:3000/tasks` - Tasks management
- `http://localhost:3000/users` - Users management

## Custom Views

The app includes custom read-only views that demonstrate advanced UI features:

- **Project View** (`/projects/:id/view`): Display project details with action buttons
  - Update Project Status action with dropdown selector
- **Task View** (`/tasks/:id/view`): Display task details with contextual actions
  - Start Task action (visible when status is "To Do")
  - Assign Task action with searchable user dropdown
  - Complete Task action with notes input (visible when status is "In Progress")
- **User View** (`/users/:id/view`): Display user profile information

All views include:

- Read-only field display with proper formatting
- Action buttons in the toolbar
- Modal confirmations with form inputs
- Permission-based access control
- Real-time GraphQL queries

## Testing

This app is also a reference implementation for how to structure Drumr app tests.

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Backend testing guide (patterns, conventions, commands):

- See [backend/tests/README.md](backend/tests/README.md)

Frontend testing guide (patterns, conventions, commands):

- See [frontend/tests/README.md](frontend/tests/README.md)

Recommended learning path for app developers:

1. Start with backend unit tests (`backend/tests/unit`).
2. Continue with frontend unit tests (`frontend/tests/unit`).
3. Review backend integration tests (`backend/tests/integration`).
4. Review frontend integration tests (`frontend/tests/integration`).

## Project Structure

```
project-management-app/
├── backend/               # Backend application
│   ├── src/
│   │   ├── data/         # Data models
│   │   │   ├── User.ts
│   │   │   ├── Project.ts
│   │   │   └── Task.ts
│   │   ├── dataSources/  # Database configuration
│   │   │   └── mainDs.ts
│   │   ├── actions/      # Business logic actions
│   │   │   ├── tasks/
│   │   │   │   ├── CompleteTask.ts
│   │   │   │   ├── AssignTask.ts
│   │   │   │   └── StartTask.ts
│   │   │   └── projects/
│   │   │       └── UpdateProjectStatus.ts
│   │   ├── auth/         # Authentication and permissions
│   │   │   └── permissions.ts
│   │   ├── dataSets/     # Sample data
│   │   │   └── mainDs-default/
│   │   │       ├── User.jsonl
│   │   │       ├── Project.jsonl
│   │   │       └── Task.jsonl
│   │   └── App.ts       # Application entry point
│   ├── config/           # Configuration files
│   │   ├── jest.config.ts
│   │   └── jest.setup.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # Frontend UI
│   ├── src/
│   │   ├── views/
│   │   │   ├── customViews/  # Custom read-only views
│   │   │   │   ├── projects/
│   │   │   │   │   └── ViewProjectView.tsx
│   │   │   │   ├── tasks/
│   │   │   │   │   └── ViewTaskView.tsx
│   │   │   │   └── users/
│   │   │   │       └── ViewUserView.tsx
│   │   │   └── context.ts
│   │   └── app.tsx
│   ├── public/
│   │   └── logo.svg
│   ├── package.json
│   ├── tsconfig.json
│   └── .umirc.ts
├── scripts/              # Utility scripts
│   ├── restore-database.sh   # Database restoration script
│   ├── restore-database.ts   # TypeScript version
│   └── README.md            # Scripts documentation
├── docker-compose.yml    # Database infrastructure
├── package.json          # Workspace configuration
└── README.md
```

## GraphQL Examples

### Login

```graphql
mutation Login {
  login(email: "admin@company.com", password: "password123") {
    token
    userId
    email
    roles
  }
}
```

### Create a Project

```graphql
mutation CreateProject($input: ProjectCreateInput!) {
  ProjectCreate(input: $input) {
    ... on Project {
      id
      name
      code
      status
      priority
      manager {
        id
        fullName
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "name": "New Project",
    "code": "PROJ-001",
    "description": "<p>Project description</p>",
    "status": "planning",
    "priority": "high",
    "startDate": "2024-01-01T00:00:00.000Z",
    "manager": { "id": "manager-1-id" }
  }
}
```

### Create a Task

```graphql
mutation CreateTask($input: TaskCreateInput!) {
  TaskCreate(input: $input) {
    ... on Task {
      id
      title
      status
      priority
      project {
        id
        name
      }
      assignee {
        id
        fullName
      }
    }
  }
}
```

### Complete a Task

```graphql
mutation CompleteTask($id: String!, $params: CompleteTaskParamsInput) {
  TaskCompleteTask(id: $id, params: $params) {
    ... on Task {
      id
      title
      status
      completedAt
    }
  }
}
```

## Features Demonstrated

### Field Types

- ✅ TextField with validation (regex, min/max length)
- ✅ EmailField with automatic validation
- ✅ HtmlField for rich text content
- ✅ UuidField for unique identifiers
- ✅ ChoiceField with enums
- ✅ DateTimeField
- ✅ IntegerField with min/max
- ✅ MoneyField with decimals
- ✅ DecimalField with precision
- ✅ BooleanField
- ✅ ReferenceField for relationships
- ✅ Array fields

### Model Features

- ✅ CRUD auto-generation
- ✅ GraphQL API exposure
- ✅ Field validation
- ✅ Relationships (one-to-many, many-to-many)
- ✅ Cascade delete behavior
- ✅ Default values

### Actions

- ✅ ObjectAction (actions on model instances)
- ✅ ModelAction support structure
- ✅ Parameter validation
- ✅ canExecute validation
- ✅ Business logic execution
- ✅ GraphQL API exposure

### Permissions

- ✅ Role-based access control
- ✅ Field-level permissions
- ✅ Conditional access (user-specific data)
- ✅ Action execution permissions
- ✅ Guest permissions

### Data Management

- ✅ Sample dataset with realistic data
- ✅ Relationship data loading
- ✅ JSONL format for datasets
- ✅ Automated database restoration script
- ✅ Foreign key constraint handling

## Troubleshooting

### Database Connection Issues

If you see database connection errors:

1. Verify Docker is running: `docker ps`
2. Start the database: `docker compose up -d`
3. Check logs: `docker compose logs -f`

### Foreign Key Constraint Violations

If you encounter foreign key errors when loading data:

```
ERROR: insert or update on table "task" violates foreign key constraint
```

Use the restoration script which loads data in the correct order:

```bash
./scripts/restore-database.sh
```

### Port Already in Use

If port 3000 or 8000 is already in use:

1. Stop any running instances: `pkill -f "node.*dev"`
2. Or change ports in `docker-compose.yml` and `.env` files

### Schema Synchronization

Schema synchronization is enabled by default. The database schema is updated automatically whenever the backend starts. No manual migration step is needed during development.

## Development Notes

- The app uses PostgreSQL as the primary database
- TypeScript is configured with strict mode
- All models expose CRUD operations via GraphQL
- Permissions are enforced at the framework level
- The app automatically synchronizes database schema in development mode

## License

MIT

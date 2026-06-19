# Tasky app - Summary

## Overview

This demo app showcases comprehensive usage of the Drumr framework for building a project and task management system.

## Key Features Demonstrated

### 1. Data Models (3 models)

- **User**: Multi-role user management with authentication
- **Project**: Complex model with 15+ field types
- **Task**: Work item tracking with relationships

### 2. Field Types Showcased

✅ UuidField (primary keys) ✅ TextField (with regex validation) ✅ EmailField ✅ HtmlField (rich text) ✅ ChoiceField (enums) ✅ DateTimeField ✅ IntegerField (with min/max) ✅ MoneyField (with decimals) ✅ DecimalField (with precision) ✅ BooleanField ✅ ReferenceField (relationships) ✅ Array fields (tags, team members)

### 3. Actions (4 custom actions)

- **CompleteTask**: Mark tasks as completed with notes
- **AssignTask**: Assign tasks to users
- **StartTask**: Begin work on tasks
- **UpdateProjectStatus**: Change project status

### 4. Permissions (CASL-based)

- Guest permissions (none - authentication required)
- System role (full access)
- Admin role (manage all resources)
- Manager role (manage their own projects)
- Developer role (work on assigned tasks)

### 5. API

- Full GraphQL API exposure
- CRUD operations auto-generated
- Actions exposed via GraphQL
- Type-safe operations

### 6. Default Dataset

7 users with different roles:

- 1 System administrator
- 1 Admin
- 2 Managers
- 3 Developers

4 projects with realistic data 10 tasks across different projects and states

### 7. Architecture

- **Workspace structure**: backend/ and frontend/ directories
- **Database**: PostgreSQL with TypeORM
- **Frontend**: UmiJS + Ant Design + Apollo Client
- **Backend**: TypeScript + Drumr Framework

## Running the App

The app is designed to work with the Drumr CLI:

```bash
# From the framework repository root
cd apps/project-management-app

# Install dependencies
npm run install:all

# Start database
docker-compose up -d

# Run the app
drumr run

# Or in development mode with hot-reload
drumr run
```

## Default Login Credentials

All test users use the password: `password123`

- System: admin@projectmanagement.com
- Admin: admin@company.com
- Manager: manager1@company.com
- Developer: dev1@company.com

## Testing the API

1. Login at http://localhost:3000/auth/login
2. Use the returned JWT token in GraphQL Playground at http://localhost:3000/graphql
3. Try CRUD operations on Projects, Tasks, and Users
4. Execute custom actions (CompleteTask, AssignTask, etc.)

## Code Quality

- TypeScript with strict mode
- Comprehensive inline documentation
- Consistent naming conventions
- Clear separation of concerns
- Example-ready code structure

## Purpose

This app serves as:

1. **Demo**: Shows framework capabilities
2. **Template**: Starting point for new apps
3. **Testing**: Validates framework features
4. **Documentation**: Live code examples

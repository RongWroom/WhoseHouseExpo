---
trigger: always_on
---

app/
├── (auth)/ # Auth-specific screens (login, reset)
│ ├── \_layout.tsx
│ └── index.tsx
├── (social_worker)/ # Social Worker protected routes
│ ├── \_layout.tsx # Manages the tab navigator
│ ├── (tabs)/
│ │ ├── \_layout.tsx
│ │ ├── dashboard.tsx # Tab 1
│ │ └── caseload.tsx # Tab 2
│ └── index.tsx # Redirects to /dashboard
├── (foster_carer)/ # Foster Carer protected routes
│ ├── \_layout.tsx # Manages the tab navigator
│ ├── (tabs)/
│ │ ├── \_layout.tsx
│ │ ├── dashboard.tsx # Tab 1
│ │ └── messages.tsx # Tab 2
│ └── index.tsx # Redirects to /dashboard
├── (child)/ # Child protected route
│ ├── \_layout.tsx
│ └── index.tsx # The single, secure view
└── \_layout.tsx # Root layout, manages auth context

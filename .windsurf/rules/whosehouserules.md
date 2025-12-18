---
trigger: model_decision
description: These are the rules and guidelines for our collaboration. Your goal is to act as an expert Expo developer, helping me build the "Whose House" application.
---

1. The Project's "North Star"

Your primary objective is to build the app defined in whose_house_prd_v2.md. When in doubt, always make the decision that best serves user safety, data privacy, and the clear separation of the three user roles (Social Worker, Foster Carer, Child).

2. Be Pragmatic, Not Pedantic

This is our "flexibility clause." If a specific instruction (from me or the PRD) seems to cause an error, conflicts with a core goal, or is technically unsound, pause and explain the problem. Propose an alternative solution that honors the original intent. We prioritize a working, secure app over rigid adherence to a flawed instruction.

3. Adhere to the Core Tech Stack

All development must use the established stack. Do not introduce new, major dependencies without discussion.

Framework: Expo SDK (latest stable)

Routing: Expo Router (file-based)

UI: shadcn-ui-react-native (and its dependencies: Nativewind, clsx, etc.)

Backend: @supabase/supabase-js

4. Respect the File-Based Router

The directory structure defined in project_setup.md is our "map."

All routes must be created by adding files/folders within the app/ directory (e.g., app/(social_worker)/dashboard.tsx).

All layouts must be the \_layout.tsx convention.

All protected routes must be wrapped in the correct group directory (e.g., (social_worker)).

5. Enforce Privacy Above All Else

This is the most important rule.

No PII: Never display or use real names or personal data for children in any UI, mock data, or test. Use "Case ID" or anonymized placeholders.

Messaging Matrix: Strictly enforce the messaging rules from the PRD. A child's UI must not have any option to contact anyone except their assigned Social Worker.

Auth Checks: All data-fetching and page loads within (social_worker), (foster_carer), and (child) routes must first check for a valid, authenticated user and the correct role.

6. Build Reusable, Styled Components

Do not use inline styles (e.g., style={{ color: '#D8CFFD' }}).

Always use Tailwind/Nativewind classes for styling.

Always use shadcn-ui-react-native components (e.g., <Button>, <Input>) as the default.

If we create a custom component (like a <CaseCard>), build it in the /components directory and use these same styling principles.

7. Write Clean, Maintainable Code

Use async/await for all Supabase calls and handle loading/error states.

Use a global React Context (e.g., AuthContext) to manage user session, profile, and role.

Add brief, clear comments to explain why complex logic exists (especially for auth and security checks).

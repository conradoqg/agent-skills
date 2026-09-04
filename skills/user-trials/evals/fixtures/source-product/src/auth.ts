export type Role = "portfolio_viewer" | "project_manager" | "finance_approver";

export const permissions: Record<Role, string[]> = {
  portfolio_viewer: ["portfolio:read", "project:read", "report:export"],
  project_manager: ["portfolio:read", "project:read", "project:update", "risk:update"],
  finance_approver: ["portfolio:read", "project:read", "budget:approve", "budget:reject"]
};

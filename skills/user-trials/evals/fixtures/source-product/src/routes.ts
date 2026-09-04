export const routes = [
  { path: "/portfolio", jobs: ["scan delivery health", "find delayed projects", "export a review pack"] },
  { path: "/projects/:id", jobs: ["understand delay causes", "update owner and recovery date"] },
  { path: "/projects/:id/risks", jobs: ["record and resolve delivery risks"] },
  { path: "/approvals", jobs: ["review budget changes", "approve or reject with an audit reason"] }
];

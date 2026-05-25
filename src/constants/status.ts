export const statusConst = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  PENDING: "PENDING",
  BLOCKED: "BLOCKED",
  DISABLED: "DISABLED",
} as const;

export const statusesArr = Object.values(statusConst);

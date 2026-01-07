export function getPlanCredits(plan) {
  switch (plan) {
    case "pro":
      return 500;
    case "academia":
      return 1000;
    case "personal":
    default:
      return 100;
  }
}

export function getCostByType(type) {
  switch (type) {
    case "test":
      return 5;
    case "guia":
      return 4;
    case "resumen":
      return 3;
    default:
      return 5;
  }
}

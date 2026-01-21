// server/src/jobs/resetCredits.js
import cron from "node-cron";
import User from "../models/User.js";

// Ejecutar el día 1 de cada mes a las 00:05 (hora del servidor)
export function startCreditsResetJob() {
  // minuto hora díaMes mes díaSemana
  // 00:05 del día 1 de cada mes
  cron.schedule("5 0 1 * *", async () => {
    try {
      console.log("Reset mensual de créditos iniciado...");

      const result = await User.updateMany({}, { $set: { creditsUsed: 0 } });

      const modified =
        typeof result.modifiedCount === "number"
          ? result.modifiedCount
          : result.nModified || 0;

      console.log(`Créditos reseteados para ${modified} usuarios`);
    } catch (err) {
      console.error("Error reseteando créditos:", err);
    }
  });
}

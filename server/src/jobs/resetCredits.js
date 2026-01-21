// server/src/jobs/resetCredits.js
import cron from "node-cron";
import User from "../models/User.js";

// Ejecutar el día 1 de cada mes a las 00:05
export function startCreditsResetJob() {
cron.schedule("1 * * 00 05", async () => {
    try {
      console.log(" Reset mensual de créditos iniciado...");

      const result = await User.updateMany(
        {},
        { $set: { creditsUsed: 0 } }
      );

      console.log(
        ` Créditos reseteados para ${result.modifiedCount} usuarios`
      );
    } catch (err) {
      console.error(" Error reseteando créditos:", err);
    }
  });
}

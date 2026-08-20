const { getSharedPrismaClient } = require("./services/sharedDatabase");
const p = getSharedPrismaClient();
p.appointment.findMany({
  where: { customerName: { contains: "مريض" } },
  orderBy: { startTime: "asc" },
  select: { id: true, customerName: true, startTime: true, appointmentDate: true }
}).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => console.error(e.message));

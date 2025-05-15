import { PrismaClient } from "../generated/prisma";
const prisma = new PrismaClient();

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5); // "HH:MM"
}

async function main() {
  // Create multiple users
  const users = await prisma.user.createMany({
    data: [
      { username: "admin2", password: "123456" },
      { username: "bob", password: "123456" },
    ],
  });

  const createdUsers = await prisma.user.findMany();

  // Creatin staff
  await prisma.staff.createMany({
    data: [
      { name: "Dr. Kai Gao", role: "Doctor" },
      { name: "Dr. Jane Smith", role: "Doctor" },
    ],
  });

  const staffMembers = await prisma.staff.findMany();

  // Create multiple patients
  const patients = await prisma.patient.createMany({
    data: [
      {
        firstName: "Emily",
        lastName: "Clark",
        dateOfBirth: new Date("1985-06-15"),
        gender: "female",
        phone: "555-0001",
        email: "emily@example.com",
        address: "101 Apple Rd",
        city: "Newtown",
        zipCode: "10001",
        userId: createdUsers[0].id,
      },
      {
        firstName: "Michael",
        lastName: "Brown",
        dateOfBirth: new Date("1979-09-10"),
        gender: "male",
        phone: "555-0002",
        email: "michael@example.com",
        address: "202 Banana Ave",
        city: "Oldtown",
        zipCode: "10002",
        userId: createdUsers[1].id,
      },
    ],
  });

  const createdPatients = await prisma.patient.findMany();

  // Create multiple appointments
  await prisma.appointment.createMany({
    data: [
      {
        patientId: createdPatients[0].id,
        userId: createdUsers[0].id,
        title: "Initial Consultation",
        date: new Date("2025-06-01"),
        startTime: formatTime(new Date("2025-06-01T10:00:00")),
        endTime: formatTime(new Date("2025-06-01T10:30:00")),
        type: "consultation",
      },
      {
        patientId: createdPatients[1].id,
        userId: createdUsers[1].id,
        title: "Follow-up",
        date: new Date("2025-06-02"),
        startTime: formatTime(new Date("2025-06-01T10:00:00")),
        endTime: formatTime(new Date("2025-06-01T10:30:00")),
        type: "checkup",
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

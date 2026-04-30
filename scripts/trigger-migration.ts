async function run() {
  try {
    console.log("Triggering database migration/seed...");
    const res = await fetch("http://localhost:3000/api/migrate");
    const data = await res.json();
    console.log("Migration result:", data);
  } catch (error) {
    console.error("Failed to trigger migration:", error);
  }
}

run();

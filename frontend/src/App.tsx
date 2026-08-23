import { useEffect, useState } from "react";

type Status = "checking" | "online" | "offline";

export default function App() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    fetch("/health")
      .then((res) => (res.ok ? setStatus("online") : setStatus("offline")))
      .catch(() => setStatus("offline"));
  }, []);

  const label = {
    checking: "Checking backend...",
    online: "Backend reachable",
    offline: "Backend not reachable",
  }[status];

  const colour = {
    checking: "text-neutral-500",
    online: "text-green-700",
    offline: "text-red-700",
  }[status];

  return (
    <main className="min-h-dvh bg-neutral-50 p-6">
      <h1 className="text-2xl font-medium text-neutral-900">FairRate</h1>
      <p className={`mt-2 ${colour}`}>{label}</p>
    </main>
  );
}

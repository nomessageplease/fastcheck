import { DatabaseTest } from "@/components/debug/database-test"

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-8">Отладка системы</h1>
      <DatabaseTest />
    </div>
  )
}

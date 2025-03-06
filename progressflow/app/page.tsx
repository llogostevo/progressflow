import FlowchartTeachingTool from "@/components/flowchart-teaching-tool"
import { Coffee } from "lucide-react"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-7xl flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="relative w-10 h-10 mr-3 bg-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg font-bold">PF</span>
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 tracking-tight">
            ProgressFlow
          </h1>
        </div>

        <a
          href="https://buymeacoffee.com/lstevens"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-[#000000] font-bold py-2 px-4 rounded-md transition-all"
        >
          <Coffee size={20} />
          <span>Buy me a coffee</span>
        </a>
      </div>

      <div className="w-full h-[calc(100vh-150px)]">
        <FlowchartTeachingTool />
      </div>
    </main>
  )
}


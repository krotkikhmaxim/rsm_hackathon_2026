// components/layout/Header.tsx
export default function Header() {
  return (
    <header className="bg-[#0f172a] border-b border-white/10 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-100">ML Inference Service</h1>
          <span className="text-sm text-gray-400 hidden sm:inline">
            Система кибербезопасности
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300 hidden md:inline">
            Хакатон МФТИ 2026
          </span>
        </div>
      </div>
    </header>
  );
}
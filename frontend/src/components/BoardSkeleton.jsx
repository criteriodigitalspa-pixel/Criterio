
import clsx from 'clsx';

export default function BoardSkeleton() {
    // 5 Columns placeholder
    const columns = Array(5).fill(null);
    // 3 Cards per column
    const cards = Array(3).fill(null);

    return (
        <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-800 p-4 pb-20">
            <div className="flex flex-col md:grid md:grid-cols-2 lg:flex lg:flex-row lg:min-w-[2600px] gap-5 items-start h-full">
                {columns.map((_, colIdx) => (
                    <div
                        key={colIdx}
                        className="flex-shrink-0 w-full lg:w-80 rounded-2xl flex flex-col bg-gray-900/40 border border-gray-800/50 shadow-md h-[500px] animate-pulse"
                    >
                        {/* Header Skeleton */}
                        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-xl">
                            <div className="h-4 w-32 bg-gray-800 rounded"></div>
                            <div className="h-5 w-8 bg-gray-800 rounded-full"></div>
                        </div>

                        {/* Cards Skeleton */}
                        <div className="flex-1 p-3 space-y-3 overflow-hidden">
                            {cards.map((_, cardIdx) => (
                                <div key={cardIdx} className="bg-gray-800/20 rounded-lg p-3 border border-gray-800 space-y-3">
                                    {/* Top Row: ID and Date */}
                                    <div className="flex justify-between items-center">
                                        <div className="h-5 w-16 bg-gray-800 rounded"></div>
                                        <div className="h-4 w-12 bg-gray-800 rounded"></div>
                                    </div>
                                    {/* Title */}
                                    <div className="h-4 w-3/4 bg-gray-800 rounded"></div>
                                    {/* Grid Specs */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="h-4 bg-gray-800 rounded"></div>
                                        <div className="h-4 bg-gray-800 rounded"></div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="h-5 w-12 bg-gray-800 rounded"></div>
                                        <div className="h-6 w-6 bg-gray-800 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

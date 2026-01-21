import clsx from 'clsx';

export default function TaskCardSkeleton() {
    return (
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-800 animate-pulse">
            <div className="flex items-start gap-3">
                {/* Checkbox Placeholder */}
                <div className="w-5 h-5 rounded-full bg-gray-700/50 shrink-0 mt-0.5" />

                {/* Text Placeholder */}
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700/50 rounded w-3/4" />
                    <div className="h-3 bg-gray-700/30 rounded w-1/2" />
                </div>
            </div>

            {/* Meta Placeholder */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-3 bg-gray-700/50 rounded" />
                    <div className="w-12 h-3 bg-gray-700/50 rounded" />
                </div>
                {/* Avatar Placeholder */}
                <div className="w-5 h-5 rounded-full bg-gray-700/50" />
            </div>
        </div>
    );
}

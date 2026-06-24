import React from 'react';

interface HighlightTextProps {
    text: string;
    search: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, search }) => {
    if (!search || !text) {
        return <>{text}</>;
    }

    // Escape regex characters
    const escapedSearch = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearch})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <mark key={i} className="bg-amber-100 text-amber-900 font-extrabold px-0.5 rounded-sm">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};
export default HighlightText;

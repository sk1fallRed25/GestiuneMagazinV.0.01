import React from 'react';
import { splitTextByQuery } from '../../utils/search';

interface HighlightTextProps {
    text: string;
    search: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ text, search }) => {
    if (!search || !text) {
        return <>{text}</>;
    }

    const parts = splitTextByQuery(text, search);

    return (
        <>
            {parts.map((part, i) => 
                part.isMatch ? (
                    <mark key={i} className="bg-amber-100 text-amber-900 font-extrabold px-0.5 rounded-sm">
                        {part.text}
                    </mark>
                ) : (
                    part.text
                )
            )}
        </>
    );
};
export default HighlightText;

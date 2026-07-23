import React from "react";

interface FormattedTextProps {
  content?: string;
  className?: string;
  as?: React.ElementType;
  [key: string]: any;
}

/**
 * Safely renders rich formatted text containing HTML tags (colors, spans, b, i, u)
 * or falls back to plain text rendering if no HTML formatting tags are present.
 */
export const FormattedText: React.FC<FormattedTextProps> = ({
  content = "",
  className = "",
  as: Component = "span",
  ...props
}) => {
  if (!content) return null;

  // Detect HTML formatting tags
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <Component
        className={className}
        dangerouslySetInnerHTML={{ __html: content }}
        {...props}
      />
    );
  }

  return (
    <Component className={className} {...props}>
      {content}
    </Component>
  );
};

export default FormattedText;

import React from "react";
import DOMPurify from "dompurify";

interface FormattedTextProps {
  content?: string;
  className?: string;
  as?: React.ElementType;
  [key: string]: any;
}

/**
 * Safely renders rich formatted text containing HTML tags (colors, spans, b, i, u)
 * sanitized against XSS via DOMPurify, or falls back to plain text rendering.
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
    const cleanHtml = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "span", "b", "strong", "i", "em", "u", "p", "br", "div", "ul", "ol", "li", "a", "h1", "h2", "h3", "h4", "h5", "h6", "small", "sub", "sup"
      ],
      ALLOWED_ATTR: ["style", "class", "href", "target", "rel", "title"],
    });

    return (
      <Component
        className={className}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
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

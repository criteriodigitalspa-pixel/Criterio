import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Bold, Italic, List, ListOrdered, Image as ImageIcon } from 'lucide-react';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import clsx from 'clsx';

// Custom Image Extension to handle generic "Paste" events logic if needed, 
// but handlePaste in editorProps is cleaner.

const RichTextEditor = ({ value, onChange, placeholder, taskId }) => {

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true, // Allow base64 temporarily
            }),
        ],
        content: value || '', // Set initial content
        editorProps: {
            attributes: {
                class: 'prose prose-invert prose-sm sm:prose-base max-w-none focus:outline-none min-h-[150px] p-4 text-gray-300',
            },
            handlePaste: (view, event, slice) => {
                const items = event.clipboardData?.items;
                if (!items) return false;

                let imageItem = null;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        imageItem = items[i];
                        break;
                    }
                }

                if (imageItem) {
                    event.preventDefault();
                    const file = imageItem.getAsFile();
                    handleImageUpload(file, view);
                    return true;
                }
                return false;
            },
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    const file = event.dataTransfer.files[0];
                    if (file.type.indexOf('image') !== -1) {
                        event.preventDefault();
                        handleImageUpload(file, view);
                        return true;
                    }
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Update content if value changes externally (and editor is not focused? or force?)
    // This is tricky with WYSIWYG. Usually we rely on initialContent. 
    // If we update on every render, cursor jumps.
    // For this simple case, we trust internal state after mount, unless value is reset (e.g. empty).
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            // Only update if significantly different to avoid loops/cursor issues? 
            // Better strategy: Only set content if editor is empty (new task) or drastically different.
            // For now, naive check. If value is empty string, clear editor.
            if (!value || value === '<p></p>') {
                // editor.commands.setContent(''); 
                // Careful not to clear while typing.
            }
        }
    }, [value, editor]);


    const handleImageUpload = async (file, view) => {
        const toastId = toast.loading("Subiendo imagen... 📤");
        try {
            const fileName = `paste_${Date.now()}_${file.name || 'image'}`;
            const storageRef = ref(storage, `task_images/${taskId || 'general'}/${fileName}`);

            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Insert Image at current selection
            const { schema } = view.state;
            const node = schema.nodes.image.create({ src: downloadURL });
            const transaction = view.state.tr.replaceSelectionWith(node);
            view.dispatch(transaction);

            toast.success("Imagen insertada", { id: toastId });
        } catch (error) {
            console.error("Upload Error", error);
            toast.error("Error al subir imagen", { id: toastId });
        }
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden focus-within:border-blue-500 transition-colors">
            {/* Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-800 border-b border-gray-700">
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive('bold')}
                >
                    <Bold className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive('italic')}
                >
                    <Italic className="w-4 h-4" />
                </MenuButton>
                <div className="w-px h-4 bg-gray-700 mx-1"></div>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    isActive={editor.isActive('bulletList')}
                >
                    <List className="w-4 h-4" />
                </MenuButton>
                <MenuButton
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    isActive={editor.isActive('orderedList')}
                >
                    <ListOrdered className="w-4 h-4" />
                </MenuButton>

                {/* Image Button (Trigger File Input via Ref if needed, skipping for now as Copy/Paste is primary) */}
                {/* 
                <MenuButton onClick={() => alert("Usa Ctrl+V para pegar imágenes")} title="Pegar imagen (Ctrl+V)">
                    <ImageIcon className="w-4 h-4" />
                </MenuButton> 
                */}
            </div>

            {/* Editor */}
            <EditorContent editor={editor} />

            {/* Styles for Prose (Tailwind Typography plugin is ideal, but using custom css via styles) */}
            <style>{`
                .ProseMirror p { margin-bottom: 0.5em; }
                .ProseMirror ul { list-style-type: disc; padding-left: 1.5em; }
                .ProseMirror ol { list-style-type: decimal; padding-left: 1.5em; }
                .ProseMirror img { 
                    border-radius: 8px; 
                    max-width: 100%; 
                    border: 2px solid #374151;
                    display: block;
                    margin: 10px 0;
                }
                .ProseMirror:focus { outline: none; }
            `}</style>
        </div>
    );
};

const MenuButton = ({ children, onClick, isActive, title }) => (
    <button
        onClick={onClick}
        title={title}
        className={clsx(
            "p-1.5 rounded transition-colors",
            isActive ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
        )}
    >
        {children}
    </button>
);

export default RichTextEditor;

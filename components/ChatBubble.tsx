import { Image, Pressable, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

interface ChatBubbleProps {
    text: string;
    isUser: boolean;
    attachmentUrl?: string | null;
    onImagePress?: (url: string) => void;
}

export default function ChatBubble({ text, isUser, attachmentUrl, onImagePress }: ChatBubbleProps) {
    return (
        <View
            className={`max-w-[80%] rounded-2xl px-4 py-2 mb-3 ${isUser
                ? 'bg-blue-500 self-end rounded-tr-none'
                : 'bg-white self-start rounded-tl-none border border-gray-100 shadow-sm'
                }`}
        >
            {attachmentUrl && (
                <Pressable onPress={() => onImagePress?.(attachmentUrl)} className="mb-2 rounded-lg overflow-hidden">
                    <Image
                        source={{ uri: attachmentUrl }}
                        style={{ width: 200, height: 150, backgroundColor: '#f0f0f0' }}
                        resizeMode="cover"
                    />
                </Pressable>
            )}

            {isUser ? (
                <Text className="text-white text-base leading-5">{text}</Text>
            ) : (
                <Markdown
                    style={{
                        body: {
                            color: '#1F2937', // gray-800
                            fontSize: 16,
                            lineHeight: 22,
                        },
                        paragraph: {
                            marginVertical: 0,
                        },
                        heading1: { fontSize: 22, fontWeight: 'bold', marginVertical: 5 },
                        heading2: { fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
                        heading3: { fontSize: 18, fontWeight: 'bold', marginVertical: 5 },
                        bullet_list: { marginVertical: 5 },
                        ordered_list: { marginVertical: 5 },
                        list_item: { marginVertical: 2 },
                        code_inline: { backgroundColor: '#F3F4F6', borderRadius: 4, fontFamily: 'monospace' },
                    }}
                >
                    {text}
                </Markdown>
            )}
        </View>
    );
}

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Rostos': [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇',
    '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑',
    '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵',
    '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐'
  ],
  'Gestos': [
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇',
    '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤲', '🤝', '🙏', '✍️', '💪',
    '🦵', '🦶', '👂', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋'
  ],
  'Animais': [
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
    '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆',
    '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
    '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐',
    '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
    '🦍', '🦧', '🐘', '🦏', '🦛', '🐪', '🐫', '🦙', '🦘', '🐃', '🐂', '🐄', '🐎',
    '🐖', '🐏', '🐑', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜'
  ],
  'Comida': [
    '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
    '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽',
    '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚',
    '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕'
  ],
  'Atividades': [
    '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸',
    '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋',
    '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
    '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆',
    '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰',
    '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🪘', '🎹', '🎷', '🎺', '🪗',
    '🎸', '🪕', '🎻'
  ],
  'Objetos': [
    '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽',
    '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟',
    '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳',
    '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶',
    '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️',
    '🪓', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪',
    '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️',
    '🔭', '🔬', '🕳️', '🩹', '🩺'
  ],
  'Símbolos': [
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞',
    '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯',
    '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸',
    '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲',
    '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫',
    '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭'
  ]
};

const ALL_EMOJIS = Object.values(EMOJI_CATEGORIES).flat();

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('Rostos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmojis = searchTerm 
    ? ALL_EMOJIS.filter(emoji => 
        // Busca simples - poderia ser melhorada com nomes de emojis
        emoji.includes(searchTerm)
      )
    : EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES];

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border rounded-lg shadow-lg p-4 z-50">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar emoji..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-8"
        />
      </div>

      {/* Categories */}
      {!searchTerm && (
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {Object.keys(EMOJI_CATEGORIES).map((category) => (
            <Button
              key={category}
              size="sm"
              variant={selectedCategory === category ? "default" : "ghost"}
              onClick={() => setSelectedCategory(category)}
              className="text-xs whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
        {filteredEmojis.map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors"
            onClick={() => {
              onEmojiSelect(emoji);
              onClose();
            }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {filteredEmojis.length === 0 && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum emoji encontrado
        </div>
      )}

      {/* Close button */}
      <div className="flex justify-end mt-3">
        <Button size="sm" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
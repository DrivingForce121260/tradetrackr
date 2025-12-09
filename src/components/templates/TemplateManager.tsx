import React, { useState } from 'react';
import TemplateList from './TemplateList';
import TemplateEditor from './TemplateEditor';

interface TemplateManagerProps {
	onBack?: () => void;
	onOpenMessaging?: () => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ onBack, onOpenMessaging }) => {
	const [editingId, setEditingId] = useState<string | null>(null);

	if (editingId) {
		return <TemplateEditor templateId={editingId} onBack={() => setEditingId(null)} />;
	}

	return (
		<TemplateList 
			onBack={onBack} 
			onEditTemplate={(id) => setEditingId(id)}
			onOpenMessaging={onOpenMessaging}
		/>
	);
};

export default TemplateManager;









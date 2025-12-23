
import React from 'react';
import { PartRequest, BOMRequest } from '../../App';
import { useLanguage } from '../LanguageContext';

interface PartRequestsSectionProps {
  partRequests: PartRequest[];
  bomRequests: BOMRequest[];
  onApprovePartRequest: (req: PartRequest) => void;
  onRejectPartRequest: (id: string) => void;
  onApproveBOMRequest: (req: BOMRequest) => void;
  onRejectBOMRequest: (id: string) => void;
  resolveName: (username?: string | null) => string;
}

const Icons = {
  Save: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
};

const PartRequestsSection: React.FC<PartRequestsSectionProps> = ({ 
  partRequests, bomRequests, onApprovePartRequest, onRejectPartRequest, onApproveBOMRequest, onRejectBOMRequest, resolveName
}) => {
  const { t } = useLanguage();
  const total = partRequests.length + bomRequests.length;

  if (total === 0) return null;

  return (
    <div className="bg-red-900/10 border-2 border-red-500/30 rounded-3xl p-6 shadow-xl animate-pulse ring-1 ring-red-500/20 mb-8 overflow-hidden">
      <h2 className="text-xl font-black text-red-500 mb-4 flex items-center gap-2 uppercase tracking-tighter">
        <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">{total}</span>
        {t('req_title')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partRequests.map(req => (
          <div key={req.id} className="bg-slate-950/50 p-4 rounded-2xl border border-red-900/50 flex justify-between items-center group">
            <div className="min-w-0">
              <p className="font-mono font-bold text-white text-lg truncate">{req.partNumber}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black truncate">{resolveName(req.requestedBy)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => onApprovePartRequest(req)} className="bg-green-600 p-2 rounded-lg text-white hover:bg-green-600 transition-colors"><Icons.Save /></button>
              <button onClick={() => onRejectPartRequest(req.id)} className="bg-red-600/20 text-red-500 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors"><Icons.Trash /></button>
            </div>
          </div>
        ))}
        {bomRequests.map(req => (
          <div key={req.id} className="bg-slate-950/50 p-4 rounded-2xl border border-red-900/50 flex justify-between items-center group">
            <div className="min-w-0">
              <p className="font-mono font-bold text-white text-lg truncate">{req.parentPart} (BOM)</p>
              <p className="text-[10px] text-slate-500 uppercase font-black truncate">{resolveName(req.requestedBy)}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => onApproveBOMRequest(req)} className="bg-green-600 p-2 rounded-lg text-white hover:bg-green-600 transition-colors"><Icons.Save /></button>
              <button onClick={() => onRejectBOMRequest(req.id)} className="bg-red-600/20 text-red-500 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-colors"><Icons.Trash /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PartRequestsSection;

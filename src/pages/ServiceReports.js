import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ReportEditor from '../components/reports/ReportEditor';
import { 
  FileText, 
  Download, 
  Trash2, 
  Upload,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ServiceReports = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: '',
    reportType: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, title: '' });
  const [loadingPdf, setLoadingPdf] = useState(false);
  
  // Report editor state
  const [showReportEditor, setShowReportEditor] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [newReportDraft, setNewReportDraft] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFinalPdf, setUploadingFinalPdf] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    reportType: 'customer',
    serviceDate: '',
    pdfFile: null
  });

  // Fetch reports
  const fetchReports = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      
      if (filters.status) params.append('status', filters.status);
      if (filters.reportType) params.append('reportType', filters.reportType);
      
      const response = await axios.get(`/api/reports?${params.toString()}`);
      setReports(response.data.reports || []);
      setPagination(response.data.pagination || {});
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Open editor from navigation state (e.g. AI Assistant > Generate Report)
  useEffect(() => {
    const navState = location.state;
    if (!navState?.openReportEditor) {
      return;
    }

    const incomingContent = typeof navState.initialContent === 'string'
      ? navState.initialContent
      : '';
    const incomingReportData = navState.reportData && typeof navState.reportData === 'object'
      ? navState.reportData
      : null;

    if (!incomingReportData || !incomingReportData.title) {
      toast.error('Unable to open report editor from AI Assistant');
      navigate(location.pathname, { replace: true, state: null });
      return;
    }

    setEditingReport(null);
    setNewReportDraft({
      content: incomingContent,
      data: incomingReportData
    });
    setShowReportEditor(true);

    // Clear transient nav state so refresh/back won't re-open editor.
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  // Download PDF
  const handleDownloadPdf = async (report) => {
    if (report.status !== 'final') {
      toast.error('Only finalized reports can be downloaded as PDF');
      return;
    }

    try {
      toast.loading('Downloading PDF...', { id: 'download-pdf' });
      
      const response = await axios.get(`/api/reports/${report._id}/pdf`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss('download-pdf');
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.dismiss('download-pdf');
      toast.error('Failed to download PDF');
    }
  };

  // Delete report
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await axios.delete(`/api/reports/${reportId}`);
      toast.success('Report deleted');
      fetchReports(currentPage);
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Failed to delete report');
    }
  };

  // Handle report click - PDF preview for finalized, editor for drafts
  const handleReportClick = async (report) => {
    if (report.status === 'final') {
      // Show PDF preview for finalized reports
      try {
        setLoadingPdf(true);
        const response = await axios.get(`/api/reports/${report._id}/pdf`, {
          responseType: 'blob'
        });
        
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPdfPreview({ 
          open: true, 
          url, 
          title: report.title || 'Report Preview' 
        });
      } catch (error) {
        console.error('Error loading PDF preview:', error);
        toast.error('Failed to load PDF preview');
      } finally {
        setLoadingPdf(false);
      }
    } else {
      // Open editor for draft reports
      try {
        setLoadingDraft(true);
        const response = await axios.get(`/api/reports/${report._id}`);
        const fullReport = response.data.report;

        setNewReportDraft(null);
        setEditingReport({
          id: fullReport._id,
          content: fullReport.draftContent || '',
          data: {
            title: fullReport.title,
            reportType: fullReport.reportType,
            customerName: fullReport.customerId?.name || fullReport.metadata?.customerName,
            companyLogo: user?.companyLogo || null
          }
        });
        setShowReportEditor(true);
      } catch (error) {
        console.error('Error loading draft report:', error);
        toast.error('Failed to load draft report');
      } finally {
        setLoadingDraft(false);
      }
    }
  };

  // Close PDF preview
  const closePdfPreview = () => {
    if (pdfPreview.url) {
      window.URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview({ open: false, url: null, title: '' });
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      reportType: 'customer',
      serviceDate: '',
      pdfFile: null
    });
  };

  const closeUploadModal = () => {
    if (uploadingFinalPdf) return;
    setShowUploadModal(false);
    resetUploadForm();
  };

  const handleUploadFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setUploadForm(prev => {
      const next = { ...prev, pdfFile: selectedFile };
      if (selectedFile && !prev.title) {
        next.title = selectedFile.name.replace(/\.pdf$/i, '');
      }
      return next;
    });
  };

  const handleUploadFinalPdf = async (event) => {
    event.preventDefault();
    if (!uploadForm.pdfFile) {
      toast.error('Please choose a PDF file');
      return;
    }

    const fileName = uploadForm.pdfFile.name?.toLowerCase() || '';
    const fileType = uploadForm.pdfFile.type?.toLowerCase() || '';
    if (fileType !== 'application/pdf' && !fileName.endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', uploadForm.pdfFile);
    formData.append('title', uploadForm.title.trim());
    formData.append('reportType', uploadForm.reportType);
    if (uploadForm.serviceDate) {
      formData.append('serviceDate', uploadForm.serviceDate);
    }

    try {
      setUploadingFinalPdf(true);
      toast.loading('Uploading final report...', { id: 'upload-final-pdf' });
      await axios.post('/api/reports/upload-final', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.dismiss('upload-final-pdf');
      toast.success('Final PDF report uploaded');
      setShowUploadModal(false);
      resetUploadForm();
      fetchReports(1);
    } catch (error) {
      console.error('Error uploading final PDF report:', error);
      toast.dismiss('upload-final-pdf');
      toast.error(error.response?.data?.message || 'Failed to upload final PDF');
    } finally {
      setUploadingFinalPdf(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'final':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Finalized
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Get report type label
  const getReportTypeLabel = (type) => {
    switch (type) {
      case 'workbook':
        return 'Single System Report';
      case 'customer':
        return 'Customer Report';
      case 'trend':
        return 'Trend Report';
      default:
        return type || 'Report';
    }
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter reports by search
  const filteredReports = reports.filter(report => {
    if (!filters.search) return true;
    const searchLower = filters.search.toLowerCase();
    return (
      report.title?.toLowerCase().includes(searchLower) ||
      report.customerId?.name?.toLowerCase().includes(searchLower) ||
      report.metadata?.customerName?.toLowerCase().includes(searchLower)
    );
  });

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Service Reports</h1>
            <p className="text-gray-600 mt-1">
              View and manage your generated service reports
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="btn-primary inline-flex items-center"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Final PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="input-field pl-10"
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="w-full sm:w-40">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Finalized</option>
            </select>
          </div>

          {/* Type filter */}
          <div className="w-full sm:w-48">
            <select
              value={filters.reportType}
              onChange={(e) => setFilters(prev => ({ ...prev, reportType: e.target.value }))}
              className="input-field"
            >
              <option value="">All Types</option>
              <option value="workbook">Single System</option>
              <option value="customer">Customer Report</option>
              <option value="trend">Trend Report</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleReportClick(report)}
                      >
                        <div className="p-2 bg-blue-100 rounded-lg mr-3 hover:bg-blue-200 transition-colors">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {report.title || 'Untitled Report'}
                          </div>
                          {report.metadata?.systemNames && report.metadata.systemNames.length > 0 && (
                            <div className="text-xs text-gray-500">
                              {report.metadata.systemNames.length} system(s)
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        {report.customerId?.name || report.metadata?.customerName || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {getReportTypeLabel(report.reportType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(report.finalizedAt || report.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {report.status === 'final' && (
                          <button
                            onClick={() => handleDownloadPdf(report)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteReport(report._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * 10 + 1, pagination.total)} to{' '}
                {Math.min(currentPage * 10, pagination.total)} of {pagination.total} reports
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => fetchReports(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => fetchReports(currentPage + 1)}
                  disabled={currentPage >= pagination.pages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {filters.search || filters.status || filters.reportType
              ? 'Try adjusting your filters to see more reports.'
              : 'Generate your first report from the KPI Workbook or Systems page.'}
          </p>
          {!filters.search && !filters.status && !filters.reportType && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/customers')}
                className="btn-primary"
              >
                <Building className="h-4 w-4 mr-2" />
                Go to Customers
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">About Service Reports</h4>
            <p className="text-sm text-blue-700 mt-1">
              Service reports can be generated from the KPI Workbook (single system reports) or from the 
              Systems page under a customer (multi-system reports). Draft reports can be edited before 
              finalizing. Once finalized, reports are converted to PDF and cannot be modified.
            </p>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {pdfPreview.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{pdfPreview.title}</h3>
              <button
                onClick={closePdfPreview}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={pdfPreview.url}
                className="w-full h-full rounded border border-gray-300"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload Final PDF Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Upload Final PDF Report</h3>
              <button
                type="button"
                onClick={closeUploadModal}
                disabled={uploadingFinalPdf}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUploadFinalPdf} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF file</label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleUploadFileChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="input-field"
                  placeholder="Auto-filled from file name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report type</label>
                <select
                  value={uploadForm.reportType}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, reportType: e.target.value }))}
                  className="input-field"
                >
                  <option value="workbook">Single System</option>
                  <option value="customer">Customer Report</option>
                  <option value="trend">Trend Report</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service date (optional)</label>
                <input
                  type="date"
                  value={uploadForm.serviceDate}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, serviceDate: e.target.value }))}
                  className="input-field"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  disabled={uploadingFinalPdf}
                  className="btn-secondary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFinalPdf}
                  className="btn-primary disabled:opacity-50 inline-flex items-center"
                >
                  {uploadingFinalPdf && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading overlay for PDF */}
      {loadingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center space-x-3">
            <LoadingSpinner size="md" />
            <span className="text-gray-700">Loading PDF preview...</span>
          </div>
        </div>
      )}

      {/* Loading overlay for draft */}
      {loadingDraft && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center space-x-3">
            <LoadingSpinner size="md" />
            <span className="text-gray-700">Loading report editor...</span>
          </div>
        </div>
      )}

      {/* Report Editor for drafts */}
      <ReportEditor
        isOpen={showReportEditor}
        onClose={() => {
          setShowReportEditor(false);
          setEditingReport(null);
          setNewReportDraft(null);
        }}
        initialContent={newReportDraft?.content || ''}
        reportData={newReportDraft?.data || {}}
        existingReportId={editingReport?.id}
        existingContent={editingReport?.content}
        existingReportData={editingReport?.data}
        onFinalized={() => {
          setShowReportEditor(false);
          setEditingReport(null);
          setNewReportDraft(null);
          toast.success('Report finalized successfully!');
          fetchReports(currentPage);
        }}
      />
    </div>
  );
};

export default ServiceReports;

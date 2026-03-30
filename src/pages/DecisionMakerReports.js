import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Building,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Search,
  X
} from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PAGE_SIZE = 10;

const DecisionMakerReports = () => {
  const [loading, setLoading] = useState(true);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null, title: '' });

  const fetchReports = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', PAGE_SIZE);

      const response = await axios.get(`/api/reports/customer/finalized?${params.toString()}`);
      setReports(response.data.reports || []);
      setPagination(response.data.pagination || { current: page, pages: 1, total: 0 });
      setCurrentPage(page);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load finalized reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(1);
  }, []);

  const formatDate = (value) => {
    if (!value) return 'N/A';
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredReports = useMemo(() => {
    if (!search.trim()) return reports;
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      return (
        report.title?.toLowerCase().includes(term) ||
        report.metadata?.customerName?.toLowerCase().includes(term)
      );
    });
  }, [reports, search]);

  const handleDownload = async (reportId, reportTitle) => {
    try {
      toast.loading('Downloading report...', { id: 'decision-report-download' });
      const response = await axios.get(`/api/reports/customer/finalized/${reportId}/pdf`, {
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(reportTitle || 'service_report').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss('decision-report-download');
      toast.success('Report downloaded');
    } catch (error) {
      toast.dismiss('decision-report-download');
      toast.error(error.response?.data?.message || 'Unable to download report');
    }
  };

  const openPreview = async (report) => {
    try {
      setLoadingPdf(true);
      const response = await axios.get(`/api/reports/customer/finalized/${report._id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfPreview({
        open: true,
        url,
        title: report.title || 'Finalized Service Report'
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to open PDF preview');
    } finally {
      setLoadingPdf(false);
    }
  };

  const closePreview = () => {
    if (pdfPreview.url) {
      window.URL.revokeObjectURL(pdfPreview.url);
    }
    setPdfPreview({ open: false, url: null, title: '' });
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" text="Loading finalized service reports..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finalized Service Reports</h1>
        <p className="text-gray-600 mt-1">
          Repository of finalized reports shared by your service team.
        </p>
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search finalized reports..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

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
                    Finalized
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
                        onClick={() => openPreview(report)}
                      >
                        <div className="p-2 bg-blue-100 rounded-lg mr-3 hover:bg-blue-200 transition-colors">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {report.title || 'Untitled Report'}
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
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(report.finalizedAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleDownload(report._id, report.title)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {Math.min((currentPage - 1) * PAGE_SIZE + 1, pagination.total)} to{' '}
                {Math.min(currentPage * PAGE_SIZE, pagination.total)} of {pagination.total} reports
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No finalized reports found</h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Your service provider has not shared finalized service reports yet.
          </p>
        </div>
      )}

      {pdfPreview.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{pdfPreview.title}</h3>
              <button
                onClick={closePreview}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-4 bg-gray-100">
              <iframe
                src={pdfPreview.url}
                className="w-full h-full rounded border border-gray-300"
                title="Finalized Report Preview"
              />
            </div>
          </div>
        </div>
      )}

      {loadingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl p-6 flex items-center space-x-3">
            <LoadingSpinner size="md" />
            <span className="text-gray-700">Loading PDF preview...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionMakerReports;

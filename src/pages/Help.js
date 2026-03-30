import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  BookOpen, 
  Rocket, 
  Users, 
  Settings, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Package, 
  Bell,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  ArrowRight,
  Zap,
  Gauge,
  TrendingUp,
  Mail,
  CreditCard,
  HelpCircle
} from 'lucide-react';

const Help = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('onboarding');
  const [expandedSections, setExpandedSections] = useState({
    'getting-started': true
  });

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const isCustomerAccount = user?.accountType === 'customer';

  return (
    <div className="px-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Help & Guides</h1>
        </div>
        <p className="text-gray-600">
          Learn how to get the most out of AquaExpert for water treatment management
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('onboarding')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'onboarding'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Rocket className="h-4 w-4 mr-2" />
          Getting Started
        </button>
        <button
          onClick={() => setActiveTab('features')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'features'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap className="h-4 w-4 mr-2" />
          Features Guide
        </button>
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'faq'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          FAQ
        </button>
      </div>

      {/* Onboarding Tab */}
      {activeTab === 'onboarding' && (
        <div className="space-y-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <h2 className="text-xl font-semibold mb-2">
              Welcome to AquaExpert{user?.firstName ? `, ${user.firstName}` : ''}!
            </h2>
            <p className="text-blue-100">
              AquaExpert helps water treatment professionals monitor systems, track KPIs, manage inventory, 
              and leverage AI for insights and automation. Follow this guide to set up your account.
            </p>
          </div>

          {/* Quick Start Steps */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                Quick Start Guide
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {!isCustomerAccount && (
                <OnboardingStep
                  number={1}
                  title="Create Your First Customer"
                  description="Customers represent the organizations you service. Each customer can have multiple water treatment systems."
                  action="Go to Customers page and click 'Add Customer'"
                  icon={<Users className="h-5 w-5" />}
                />
              )}
              <OnboardingStep
                number={isCustomerAccount ? 1 : 2}
                title="Add Water Treatment Systems"
                description="Create systems for cooling towers, steam boilers, closed loops, pretreatment, or waste water. Each system type has specialized KPI tracking."
                action={isCustomerAccount ? "Go to Dashboard and add your first system" : "Click on a customer, then 'Add System'"}
                icon={<Gauge className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 2 : 3}
                title="Configure Sample Points & Parameters"
                description="Define where you take samples (e.g., 'Tower Basin', 'City Water') and which parameters you track (pH, conductivity, etc.)."
                action="Open a system's KPI Workbook → Click 'Sample Point' to add locations, 'Parameter' to add measurements"
                icon={<Settings className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 3 : 4}
                title="Set Green/Yellow Ranges"
                description="Define acceptable ranges for each parameter at each sample point. Cells turn green when in range, red when out of range."
                action="In KPI Workbook → Click 'Ranges' → Set min/max values for each sample location"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 4 : 5}
                title="Record Service Visit Data"
                description="Enter KPI readings during service visits. The workbook auto-saves and tracks history."
                action="Open KPI Workbook → Enter values in cells → Add corrective actions and comments"
                icon={<FileText className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 5 : 6}
                title="Generate and Finalize Service Report"
                description="From the workbook, click Generate Report, edit the report inline, and finalize it. Finalized reports are saved to Service Reports and published to the CRB Service Reports portal for decision makers."
                action="KPI Workbook → Generate Report → Edit inline → Finalize report → Download PDF"
                icon={<FileText className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 6 : 7}
                title="Connect Walchem Controllers (Optional)"
                description="Link Walchem controllers to sample points for automated data ingestion and AI-powered email reports. Configure controllers to send DATALOG emails once per day to reports@aquaexpert.us."
                action="In KPI Workbook → 'Sample Point' → Enter controller serial numbers"
                icon={<Zap className="h-5 w-5" />}
              />
              <OnboardingStep
                number={isCustomerAccount ? 7 : 8}
                title="Use AI Chat for Insights"
                description="Ask the AI assistant questions about water treatment, analysis, proposals, and reporting. AI Chat uses system-wide context and conversation memory to improve follow-up responses."
                action="Go to AI Chat → Attach files if needed → Ask questions"
                icon={<MessageSquare className="h-5 w-5" />}
              />
            </div>
          </div>

          {/* Workflow Diagram */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Typical Workflow</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              {!isCustomerAccount && (
                <>
                  <WorkflowStep label="Create Customer" icon={<Users className="h-4 w-4" />} />
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </>
              )}
              <WorkflowStep label="Add System" icon={<Gauge className="h-4 w-4" />} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <WorkflowStep label="Configure Workbook" icon={<Settings className="h-4 w-4" />} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <WorkflowStep label="Record Data" icon={<FileText className="h-4 w-4" />} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <WorkflowStep label="Generate Report" icon={<FileText className="h-4 w-4" />} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <WorkflowStep label="Finalize Report" icon={<CheckCircle className="h-4 w-4" />} />
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <WorkflowStep label="CRB Portal + PDF" icon={<FileText className="h-4 w-4" />} />
            </div>
          </div>
        </div>
      )}

      {/* Features Guide Tab */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          {/* Dashboard */}
          <FeatureSection
            id="dashboard"
            title="Dashboard"
            icon={<BarChart3 className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['dashboard']}
            onToggle={() => toggleSection('dashboard')}
          >
            <p className="text-gray-600 mb-4">
              Your central hub showing inventory status and recent Walchem reports at a glance.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Inventory Outlook:</strong> See which products are running low across all systems</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Walchem Reports Feed:</strong> Latest controller reports with AI-generated status (Green/Yellow/Red)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Subscription Status:</strong> View your current plan and AI message usage</span>
              </li>
            </ul>
          </FeatureSection>

          {/* Customers */}
          {!isCustomerAccount && (
            <FeatureSection
              id="customers"
              title="Customers"
              icon={<Users className="h-5 w-5 text-blue-600" />}
              expanded={expandedSections['customers']}
              onToggle={() => toggleSection('customers')}
            >
              <p className="text-gray-600 mb-4">
                Manage the organizations you provide water treatment services to.
              </p>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Add customers</strong> with contact information and notes</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>View systems</strong> by clicking on a customer</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                  <span><strong>Operator Accounts (Enterprise):</strong> Create login accounts for customer staff to view their own data</span>
                </li>
              </ul>
            </FeatureSection>
          )}

          {/* Systems */}
          <FeatureSection
            id="systems"
            title="Systems"
            icon={<Gauge className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['systems']}
            onToggle={() => toggleSection('systems')}
          >
            <p className="text-gray-600 mb-4">
              Water treatment systems are the core of AquaExpert. Each system has its own KPI workbook and inventory.
            </p>
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">System Types:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full">Pretreatment</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Cooling Tower</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full">Steam Boiler</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">Closed Loop</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">Waste Water</span>
              </div>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Click a system</strong> to expand and access KPI Workbook or Inventory</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>PDF Auto-Setup:</strong> Upload a service report PDF when creating a system to auto-populate parameters</span>
              </li>
            </ul>
          </FeatureSection>

          {/* KPI Workbook */}
          <FeatureSection
            id="kpi-workbook"
            title="KPI Workbook"
            icon={<FileText className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['kpi-workbook']}
            onToggle={() => toggleSection('kpi-workbook')}
          >
            <p className="text-gray-600 mb-4">
              An Excel-like interface for recording service visit data with automatic range validation and history tracking.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Sample Points:</strong> Define where you take samples (e.g., City Water, Tower Basin). Link Walchem controllers here.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Parameters:</strong> Add from common presets (pH, Conductivity, etc.) or create custom ones</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Ranges:</strong> Set Green (optimal) and Yellow (warning) ranges per sample location. Cells highlight based on values.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Auto-Save:</strong> Data saves automatically as you type</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>History:</strong> View and restore previous workbook snapshots</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Trends:</strong> View parameter trends over 3-24 months</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Generate Report:</strong> Click the button in the top bar to generate a service report from the current workbook data</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Image Attachments:</strong> Paste or upload images to comment sections</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <strong>Tip:</strong> Drag row numbers to reorder parameters. Select a row and press Delete to remove it.
            </div>
          </FeatureSection>

          {/* Inventory */}
          <FeatureSection
            id="inventory"
            title="Inventory Management"
            icon={<Package className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['inventory']}
            onToggle={() => toggleSection('inventory')}
          >
            <p className="text-gray-600 mb-4">
              Track chemical inventory levels per system with usage analytics and reorder alerts.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Add Products:</strong> Define tank capacity (gallons or inches) and safety stock levels</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Volume Readings:</strong> Record current levels during service visits</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Usage Analytics:</strong> View consumption trends and days-of-supply projections</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Reorder Alerts:</strong> Products show "Low Stock" or "Getting Low" warnings on dashboard</span>
              </li>
            </ul>
          </FeatureSection>

          {/* Walchem Reports */}
          <FeatureSection
            id="walchem"
            title="Walchem Reports"
            icon={<Mail className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['walchem']}
            onToggle={() => toggleSection('walchem')}
          >
            <p className="text-gray-600 mb-4">
              Automated ingestion and AI analysis of Walchem controller data sent via email.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Auto-Ingestion:</strong> Walchem controllers email CSV data, which is automatically parsed and stored</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>AI Status:</strong> Each report gets a Green/Yellow/Red status based on parameter ranges</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Trend Charts:</strong> Visualize parameter trends over 24h, 3d, 7d, or 30d</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Email Automation:</strong> Configure recipients to receive AI-generated report emails automatically</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Custom Prompts:</strong> Customize the AI analysis focus for each controller</span>
              </li>
            </ul>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Controller Setup:</strong> Configure your Walchem controller to send DATALOG emails <strong>once per day</strong> to <code className="bg-blue-100 px-1 rounded">reports@aquaexpert.us</code>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                <strong>AquaExpert Setup:</strong> In KPI Workbook → Sample Point → Enter your Walchem controller serial number to link it.
              </div>
            </div>
          </FeatureSection>

          {/* AI Chat */}
          <FeatureSection
            id="ai-chat"
            title="AI Chat"
            icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['ai-chat']}
            onToggle={() => toggleSection('ai-chat')}
          >
            <p className="text-gray-600 mb-4">
              Your AI assistant for water treatment questions, data analysis, proposal writing, and report drafting. AI Chat uses account-level context and conversation memory to improve follow-up responses.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>AI-Powered Analysis:</strong> Get intelligent insights on your water treatment data</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>System-Wide Context:</strong> The assistant can use context from your customers, systems, workbooks, inventory, and reports</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Conversation Memory:</strong> The assistant remembers recent chat history to support multi-step workflows and follow-up questions</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Attach Files:</strong> Upload documents, images, or PDFs to provide context for the AI</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Business Proposals:</strong> Draft professional proposals, quotes, and sales emails with AI assistance</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Suggested Prompts:</strong> Quick-start templates for common tasks (KPI analysis, service summaries, proposals)</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Copy Responses:</strong> Easily copy AI responses to use in reports or emails</span>
              </li>
            </ul>
            <div className="mt-4 space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Data Analysis:</strong> Share the system name and latest readings, then ask: "What parameters are out of range?" or "Draft a service visit summary"
              </div>
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                <strong>Proposals:</strong> Ask: "Write a proposal for water treatment services" or "Draft a quote email for cooling tower maintenance"
              </div>
              <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-800">
                <strong>Attachments:</strong> Upload competitor quotes, site photos, or spec sheets to give the AI context for more tailored responses
              </div>
            </div>
          </FeatureSection>

          {/* Notifications */}
          <FeatureSection
            id="notifications"
            title="Notifications"
            icon={<Bell className="h-5 w-5 text-blue-600" />}
            expanded={expandedSections['notifications']}
            onToggle={() => toggleSection('notifications')}
          >
            <p className="text-gray-600 mb-4">
              Stay informed about important events and issues across your systems.
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Bell Icon:</strong> Click the bell in the top bar to view notifications</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Parameter Matching:</strong> Alerts when Walchem parameters can't be matched to workbook parameters</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                <span><strong>Mark as Read:</strong> Click a notification to mark it read and navigate to the relevant page</span>
              </li>
            </ul>
          </FeatureSection>

          {/* Subscription */}
          {!isCustomerAccount && (
            <FeatureSection
              id="subscription"
              title="Subscription Plans"
              icon={<CreditCard className="h-5 w-5 text-blue-600" />}
              expanded={expandedSections['subscription']}
              onToggle={() => toggleSection('subscription')}
            >
              <p className="text-gray-600 mb-4">
                AquaExpert offers tiered plans to match your needs.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Free</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 1 customer</li>
                    <li>• 1 system</li>
                    <li>• 3 AI messages/month</li>
                  </ul>
                </div>
                <div className="p-4 border border-purple-200 bg-purple-50 rounded-lg">
                  <h4 className="font-semibold text-purple-900 mb-2">Enterprise - $350/mo</h4>
                  <ul className="text-sm text-purple-800 space-y-1">
                    <li>• Unlimited customers</li>
                    <li>• Unlimited systems</li>
                    <li>• Unlimited AI chatbot</li>
                    <li>• AI Walchem Reports</li>
                    <li>• Technician accounts</li>
                    <li>• Create accounts for customers</li>
                    <li>• Custom integrations</li>
                  </ul>
                </div>
              </div>
            </FeatureSection>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <FAQItem
            question="How do I link a Walchem controller to my system?"
            answer="Two steps are required: (1) On the controller side, configure it to send DATALOG emails once per day to reports@aquaexpert.us. (2) In AquaExpert, open the system's KPI Workbook → Click 'Sample Point' → Enter the controller's serial number for that sample location. The system will automatically receive and process data when the controller sends reports."
          />
          <FAQItem
            question="Why are some cells in my workbook greyed out?"
            answer="Greyed out cells indicate that no range has been set for that parameter at that sample location. Click 'Ranges' to define min/max values. Once ranges are set, the cells become editable and will highlight green (in range) or red (out of range)."
          />
          <FAQItem
            question="How do I generate and publish a service report?"
            answer="While viewing a KPI Workbook, click 'Generate Report' in the top bar. Edit the report inline, then finalize it. Finalized reports are saved in Service Reports and published to the CRB Service Reports portal for decision makers. You can download finalized reports as PDF."
          />
          <FAQItem
            question="How does AI Chat context and memory work?"
            answer="AI Chat can use system-wide context from your customers, systems, workbooks, inventory, and reports. It also remembers recent conversation history so you can ask follow-up questions without repeating all details."
          />
          <FAQItem
            question="How do I track inventory usage over time?"
            answer="Go to Inventory for a system → Add products with tank capacity → Record volume readings during each service visit. The system will calculate usage rate and project days of supply. View trends by clicking 'View' on a product."
          />
          <FAQItem
            question="What's the difference between Green and Yellow ranges?"
            answer="Green range is the optimal operating range. Yellow range is a warning zone - values are acceptable but approaching limits. Red means the value is outside all acceptable ranges and requires attention."
          />
          <FAQItem
            question="How do automated Walchem email reports work?"
            answer="First, configure your Walchem controller to send DATALOG emails once per day to reports@aquaexpert.us. Then in AquaExpert, go to Walchem Reports → Select a customer, system, and controller → Add email recipients → Save settings. When the controller sends data, the system generates an AI analysis and emails it to all recipients with trend charts."
          />
          <FAQItem
            question="Can my customers access their own data?"
            answer="Yes, with an Enterprise plan. Go to Customers → Click 'Operator Account' → Set up login credentials. The customer can log in to view their systems and workbooks with a simplified interface."
          />
          <FAQItem
            question="How do I delete a parameter from the workbook?"
            answer="Click the row number on the left to select the entire row, then press Delete or Backspace. Confirm the deletion when prompted. You can also right-click for a context menu with delete options."
          />
          <FAQItem
            question="How do I view historical workbook data?"
            answer="In KPI Workbook → Click 'View History' to see saved snapshots. Click 'Open' to view a snapshot or 'Restore as Current' to roll back to that version. Use 'View Trends' to see parameter changes over months."
          />
        </div>
      )}
    </div>
  );
};

// Onboarding Step Component
const OnboardingStep = ({ number, title, description, action, icon }) => (
  <div className="p-4 hover:bg-gray-50 transition-colors">
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
        {number}
      </div>
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <span className="text-blue-600">{icon}</span>
          <h4 className="font-medium text-gray-900">{title}</h4>
        </div>
        <p className="text-gray-600 text-sm mb-2">{description}</p>
        <p className="text-blue-600 text-sm font-medium">{action}</p>
      </div>
    </div>
  </div>
);

// Workflow Step Component
const WorkflowStep = ({ label, icon }) => (
  <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg text-blue-700">
    {icon}
    <span>{label}</span>
  </div>
);

// Feature Section Component
const FeatureSection = ({ id, title, icon, expanded, onToggle, children }) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {icon}
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      {expanded ? (
        <ChevronDown className="h-5 w-5 text-gray-400" />
      ) : (
        <ChevronRight className="h-5 w-5 text-gray-400" />
      )}
    </button>
    {expanded && (
      <div className="px-4 pb-4 border-t border-gray-100">
        <div className="pt-4">{children}</div>
      </div>
    )}
  </div>
);

// FAQ Item Component
const FAQItem = ({ question, answer }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center space-x-3">
          <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <span className="font-medium text-gray-900">{question}</span>
        </div>
        {expanded ? (
          <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <p className="pt-4 text-gray-600 pl-8">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default Help;


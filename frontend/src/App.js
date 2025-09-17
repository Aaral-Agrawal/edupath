import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import './App.css';

// Icons
import { 
  User, 
  LogOut, 
  BookOpen, 
  Award, 
  MapPin, 
  TrendingUp, 
  Brain,
  Users,
  Shield,
  Settings,
  ChevronRight,
  Sparkles,
  Target,
  Globe,
  Languages,
  Menu,
  X
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Set up axios defaults
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Context for global state
const AppContext = createContext();

const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// Language data
const languages = {
  en: 'English',
  hi: 'हिंदी', 
  ks: 'کٲشُر'
};

const translations = {
  en: {
    welcome: 'Welcome to EduPath',
    tagline: 'Your Personalized Career & Education Advisory Platform',
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    phone: 'Phone Number',
    role: 'Role',
    student: 'Student',
    parent: 'Parent',
    counselor: 'Counselor',
    admin: 'Admin',
    dashboard: 'Dashboard',
    careerRecommendations: 'Career Recommendations',
    scholarships: 'Scholarships',
    nearbyOpportunities: 'Nearby Opportunities',
    profile: 'Profile',
    logout: 'Logout',
    getRecommendations: 'Get AI Career Recommendations',
    interests: 'Interests',
    academicLevel: 'Academic Level',
    subjects: 'Subjects',
    strengths: 'Strengths',
    submit: 'Submit',
    loading: 'Loading...',
    error: 'Error occurred',
    success: 'Success!',
    language: 'Language'
  },
  hi: {
    welcome: 'एडुपाथ में आपका स्वागत है',
    tagline: 'आपका व्यक्तिगत करियर और शिक्षा सलाहकार मंच',
    login: 'लॉगिन',
    register: 'पंजीकरण',
    email: 'ईमेल',
    password: 'पासवर्ड',
    fullName: 'पूरा नाम',
    phone: 'फोन नंबर',
    role: 'भूमिका',
    student: 'छात्र',
    parent: 'अभिभावक',
    counselor: 'सलाहकार',
    admin: 'व्यवस्थापक',
    dashboard: 'डैशबोर्ड',
    careerRecommendations: 'करियर सुझाव',
    scholarships: 'छात्रवृत्ति',
    nearbyOpportunities: 'आसपास के अवसर',
    profile: 'प्रोफाइल',
    logout: 'लॉगआउट',
    getRecommendations: 'AI करियर सुझाव प्राप्त करें',
    interests: 'रुचियां',
    academicLevel: 'शैक्षणिक स्तर',
    subjects: 'विषय',
    strengths: 'शक्तियां',
    submit: 'जमा करें',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि हुई',
    success: 'सफल!',
    language: 'भाषा'
  },
  ks: {
    welcome: 'ایڈوپاتھ میں تہنز آمدید',
    tagline: 'تہند ذاتی کیریئر تہ تعلیمی مشاورتی پلیٹ فارم',
    login: 'لاگ ان',
    register: 'رجسٹر',
    email: 'ای میل',
    password: 'پاس ورڈ',
    fullName: 'مکمل ناو',
    phone: 'فون نمبر',
    role: 'کردار',
    student: 'طالب علم',
    parent: 'والدین',
    counselor: 'مشیر',
    admin: 'منتظم',
    dashboard: 'ڈیش بورڈ',
    careerRecommendations: 'کیریئر تجاویز',
    scholarships: 'وظائف',
    nearbyOpportunities: 'قریبی مواقع',
    profile: 'پروفائل',
    logout: 'لاگ آؤٹ',
    getRecommendations: 'AI کیریئر تجاویز حاصل کریں',
    interests: 'دلچسپیاں',
    academicLevel: 'تعلیمی سطح',  
    subjects: 'مضامین',
    strengths: 'صلاحیتیں',
    submit: 'جمع کریں',
    loading: 'لوڈ ہو رہا ہے...',
    error: 'خرابی ہوئی',
    success: 'کامیاب!',
    language: 'زبان'
  }
};

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['student', 'parent', 'counselor', 'admin']),
  phone: z.string().optional(),
  preferred_language: z.enum(['en', 'hi', 'ks']).optional()
});

// Components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
  </div>
);

const LanguageSelector = () => {
  const { currentLanguage, setCurrentLanguage } = useApp();
  
  return (
    <div className="flex items-center space-x-2">
      <Globe className="w-4 h-4 text-slate-400" />
      <select 
        value={currentLanguage}
        onChange={(e) => setCurrentLanguage(e.target.value)}
        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-emerald-500"
      >
        {Object.entries(languages).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  );
};

const Navigation = ({ user, onLogout }) => {
  const { t } = useApp();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-8 h-8 text-emerald-500" />
              <span className="text-xl font-bold text-white">EduPath</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <LanguageSelector />
            {user && (
              <>
                <span className="text-slate-300">
                  {t('welcome')}, {user.full_name}
                </span>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              </>
            )}
          </div>
          
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-slate-300 hover:text-white"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <div className="flex flex-col space-y-4">
              <LanguageSelector />
              {user && (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 text-slate-300 hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout')}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

const AuthForm = ({ isLogin, onSuccess }) => {
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const schema = isLogin ? loginSchema : registerSchema;
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });
  
  const onSubmit = async (data) => {
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const response = await axios.post(`${API}${endpoint}`, data);
      
      localStorage.setItem('token', response.data.access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      
      onSuccess(response.data.user);
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
      <h2 className="text-2xl font-bold text-white mb-6 text-center">
        {isLogin ? t('login') : t('register')}
      </h2>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('email')}
          </label>
          <input
            type="email"
            {...register('email')}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="your@email.com"
          />
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('password')}
          </label>
          <input
            type="password"
            {...register('password')}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>
        
        {!isLogin && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('fullName')}
              </label>
              <input
                type="text"
                {...register('full_name')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
              {errors.full_name && (
                <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('role')}
              </label>
              <select
                {...register('role')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="student">{t('student')}</option>
                <option value="parent">{t('parent')}</option>
                <option value="counselor">{t('counselor')}</option>
                <option value="admin">{t('admin')}</option>
              </select>
              {errors.role && (
                <p className="text-red-400 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('phone')} ({t('optional')})
              </label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="+91 9876543210"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('language')}
              </label>
              <select
                {...register('preferred_language')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="ks">کٲشُر</option>
              </select>
            </div>
          </>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? <LoadingSpinner /> : (isLogin ? t('login') : t('register'))}
        </button>
      </form>
    </div>
  );
};

const DashboardCard = ({ title, value, icon: Icon, color = "emerald" }) => {
  const colorClasses = {
    emerald: "from-emerald-600 to-teal-600",
    blue: "from-blue-600 to-cyan-600", 
    purple: "from-violet-600 to-purple-600",
    orange: "from-orange-600 to-red-600"
  };
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const CareerRecommendations = ({ user }) => {
  const { t } = useApp();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [formData, setFormData] = useState({
    interests: '',
    academic_level: '12th',
    subjects: '',
    strengths: '',
    career_goals: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const requestData = {
        interests: formData.interests.split(',').map(s => s.trim()).filter(s => s),
        academic_level: formData.academic_level,
        subjects: formData.subjects.split(',').map(s => s.trim()).filter(s => s),
        strengths: formData.strengths.split(',').map(s => s.trim()).filter(s => s),
        career_goals: formData.career_goals.split(',').map(s => s.trim()).filter(s => s)
      };
      
      const response = await axios.post(`${API}/career/recommendations`, requestData);
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center">
          <Brain className="w-6 h-6 text-emerald-500 mr-2" />
          {t('getRecommendations')}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('interests')}
              </label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({...formData, interests: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="Technology, Art, Science (comma separated)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('academicLevel')}
              </label>
              <select
                value={formData.academic_level}
                onChange={(e) => setFormData({...formData, academic_level: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="10th">10th Grade</option>
                <option value="12th">12th Grade</option>
                <option value="Graduate">Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('subjects')}
              </label>
              <input
                type="text"
                value={formData.subjects}
                onChange={(e) => setFormData({...formData, subjects: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="Math, Physics, Chemistry (comma separated)"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('strengths')}
              </label>
              <input
                type="text"
                value={formData.strengths}
                onChange={(e) => setFormData({...formData, strengths: e.target.value})}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500"
                placeholder="Problem Solving, Communication (comma separated)"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? <LoadingSpinner /> : t('getRecommendations')}
          </button>
        </form>
      </div>
      
      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">AI Career Recommendations</h3>
          {recommendations.map((rec, index) => (
            <div key={index} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-xl font-bold text-white">{rec.career_title}</h4>
                <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {rec.match_percentage}% Match
                </span>
              </div>
              
              <p className="text-slate-300 mb-4">{rec.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 font-medium">Education Path:</p>
                  <p className="text-slate-300">{rec.education_path}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Local Opportunities:</p>
                  <p className="text-slate-300">{rec.local_opportunities}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Skills Needed:</p>
                  <p className="text-slate-300">{rec.skills_needed?.join(', ')}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Salary Range:</p>
                  <p className="text-slate-300">{rec.salary_range}</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-slate-400 font-medium">Growth Prospects:</p>
                <p className="text-slate-300">{rec.growth_prospects}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ user }) => {
  const { t } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [scholarships, setScholarships] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, scholarshipsRes, opportunitiesRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`),
          axios.get(`${API}/scholarships`),
          axios.get(`${API}/opportunities/nearby`)
        ]);
        
        setStats(statsRes.data);
        setScholarships(scholarshipsRes.data);
        setOpportunities(opportunitiesRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };
    
    fetchDashboardData();
  }, []);
  
  const tabs = [
    { id: 'overview', label: t('dashboard'), icon: TrendingUp },
    { id: 'career', label: t('careerRecommendations'), icon: Brain },
    { id: 'scholarships', label: t('scholarships'), icon: Award },
    { id: 'opportunities', label: t('nearbyOpportunities'), icon: MapPin },
    { id: 'profile', label: t('profile'), icon: User }
  ];
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">{user.full_name}</p>
                <p className="text-slate-400 text-sm capitalize">{user.role}</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  <ChevronRight className={`w-4 h-4 ml-auto transform transition-transform ${
                    activeTab === tab.id ? 'rotate-90' : ''
                  }`} />
                </button>
              ))}
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex-1">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-white">
                {t('dashboard')} - {user.role === 'student' ? t('student') : user.role}
              </h1>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {user.role === 'student' && (
                  <>
                    <DashboardCard
                      title="Recommendations Received"
                      value={stats.recommendations_received || 0}
                      icon={Brain}
                      color="emerald"
                    />
                    <DashboardCard
                      title="Quizzes Completed"
                      value={stats.quizzes_completed || 0}
                      icon={Award}
                      color="blue"
                    />
                    <DashboardCard
                      title="Profile Completion"
                      value={`${stats.profile_completion || 0}%`}
                      icon={Target}
                      color="purple"
                    />
                  </>
                )}
                
                {user.role === 'counselor' && (
                  <>
                    <DashboardCard
                      title="Total Students"
                      value={stats.total_students || 0}
                      icon={Users}
                      color="emerald"
                    />
                    <DashboardCard
                      title="Active Sessions"
                      value={stats.active_sessions || 0}
                      icon={Brain}
                      color="blue"
                    />
                    <DashboardCard
                      title="Recommendations Given"
                      value={stats.recommendations_given || 0}
                      icon={Target}
                      color="purple"
                    />
                  </>
                )}
              </div>
              
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setActiveTab('career')}
                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:scale-105"
                  >
                    <Sparkles className="w-6 h-6 text-white" />
                    <span className="text-white font-semibold">{t('getRecommendations')}</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('scholarships')}
                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all transform hover:scale-105"
                  >
                    <Award className="w-6 h-6 text-white" />
                    <span className="text-white font-semibold">{t('scholarships')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'career' && <CareerRecommendations user={user} />}
          
          {activeTab === 'scholarships' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">{t('scholarships')}</h2>
              <div className="grid gap-6">
                {scholarships.map((scholarship) => (
                  <div key={scholarship.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">{scholarship.title}</h3>
                      <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                        {scholarship.amount}
                      </span>
                    </div>
                    <p className="text-slate-300 mb-4">{scholarship.description}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 font-medium">Eligibility:</p>
                        <p className="text-slate-300">{scholarship.eligibility}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 font-medium">Deadline:</p>
                        <p className="text-slate-300">{scholarship.deadline}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'opportunities' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">{t('nearbyOpportunities')}</h2>
              <div className="grid gap-6">
                {opportunities.map((opportunity) => (
                  <div key={opportunity.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white">{opportunity.name}</h3>
                        <p className="text-emerald-400">{opportunity.type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-300 text-sm">{opportunity.distance}</p>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">★</span>
                          <span className="text-slate-300 text-sm">{opportunity.rating}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-slate-400 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{opportunity.location}</span>
                    </div>
                    <p className="text-slate-300 mb-2">
                      <strong>Courses:</strong> {opportunity.courses.join(', ')}
                    </p>
                    <p className="text-slate-400 text-sm">{opportunity.contact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'profile' && (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-6">{t('profile')}</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1">Full Name</label>
                    <p className="text-white">{user.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1">Email</label>
                    <p className="text-white">{user.email}</p>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1">Role</label>
                    <p className="text-white capitalize">{user.role}</p>
                  </div>
                  <div>
                    <label className="block text-slate-400 text-sm font-medium mb-1">Language</label>
                    <p className="text-white">{languages[user.preferred_language] || 'English'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LandingPage = ({ onAuthModeChange }) => {
  const { t } = useApp();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-teal-600/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <BookOpen className="w-16 h-16 text-emerald-500" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Edu<span className="text-emerald-500">Path</span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
              {t('tagline')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onAuthModeChange(false)}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {t('register')}
              </button>
              <button
                onClick={() => onAuthModeChange(true)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 px-8 rounded-lg border border-slate-600 hover:border-slate-500 transition-all duration-200"
              >
                {t('login')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI Career Guidance</h3>
            <p className="text-slate-400">Personalized career recommendations powered by advanced AI</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Scholarship Directory</h3>
            <p className="text-slate-400">Find and apply for scholarships that match your profile</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Local Opportunities</h3>
            <p className="text-slate-400">Discover nearby colleges, ITIs, and educational institutions</p>
          </div>
          
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-600 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Languages className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Language</h3>
            <p className="text-slate-400">Available in English, Hindi, and Kashmiri languages</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState(null); // null: landing, true: login, false: register
  const [currentLanguage, setCurrentLanguage] = useState('en');
  
  const t = (key) => translations[currentLanguage][key] || key;
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token and get user info
      axios.get(`${API}/auth/me`)
        .then(response => {
          setUser(response.data);
          setCurrentLanguage(response.data.preferred_language || 'en');
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);
  
  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setCurrentLanguage(userData.preferred_language || 'en');
    setAuthMode(null);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setAuthMode(null);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }
  
  return (
    <AppContext.Provider value={{ 
      currentLanguage, 
      setCurrentLanguage, 
      t,
      user,
      setUser: setUser
    }}>
      <BrowserRouter>
        <div className="min-h-screen bg-slate-900">
          <Navigation user={user} onLogout={handleLogout} />
          
          <main className="py-8">
            {!user ? (
              authMode === null ? (
                <LandingPage onAuthModeChange={setAuthMode} />
              ) : (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
                      <AuthForm 
                        isLogin={authMode} 
                        onSuccess={handleAuthSuccess}
                      />
                      
                      <div className="text-center mt-6">
                        <button
                          onClick={() => setAuthMode(!authMode)}
                          className="text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          {authMode 
                            ? "Don't have an account? Register" 
                            : "Already have an account? Login"
                          }
                        </button>
                      </div>
                      
                      <div className="text-center mt-4">
                        <button
                          onClick={() => setAuthMode(null)}
                          className="text-slate-400 hover:text-slate-300 transition-colors"
                        >
                          ← Back to Home
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <Dashboard user={user} />
            )}
          </main>
        </div>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
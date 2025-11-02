import React, { useState, useEffect } from 'react';

// --- Configuration ---
// Change this to your actual backend URL
const API_BASE_URL = 'http://localhost:3000/api'; 

// --- Helper Functions ---
/**
 * A simple fetch wrapper with error handling
 * @param {string} url - The URL to fetch (relative to API_BASE_URL)
 * @param {object} options - The options for the fetch call
 */
const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`API fetch error for ${url}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
};

// --- React Components ---

/**
 * Navigation Bar
 */
function Navigation({ page, setPage }) {
  const navItems = ['Home', 'About', 'Artwork', 'Admin'];
  
  return (
    <nav className="bg-[#FFF8E1] p-4 shadow-md sticky top-0 z-10">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#6D4C41] font-serif">Aaradhya's Gita</h1>
        <ul className="flex space-x-6">
          {navItems.map((item) => (
            <li key={item}>
              <button
                onClick={() => setPage(item.toLowerCase())}
                className={`text-lg ${
                  page === item.toLowerCase()
                    ? 'text-[#BFA080] border-b-2 border-[#BFA080]'
                    : 'text-[#6D4C41]'
                } hover:text-[#BFA080] transition duration-300 pb-1`}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/**
 * Shlokas Page (Home)
 * Corresponds to image_273866.png
 */
function ShlokasPage() {
  const [shlokas, setShlokas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShlokas = async () => {
      try {
        const data = await apiFetch('/shlokas');
        setShlokas(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchShlokas();
  }, []);

  const getYouTubeEmbedUrl = (videoId) => {
    return `https://www.youtube.com/embed/${videoId}`;
  };
  
  // Group shlokas by adhyay
  const shlokasByAdhyay = shlokas.reduce((acc, shloka) => {
    const adhyay = shloka.adhyay || 0;
    if (!acc[adhyay]) {
      acc[adhyay] = [];
    }
    acc[adhyay].push(shloka);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-4xl font-bold text-center text-[#6D4C41] mb-10 font-serif">Chapters and Shlokas of the Gita</h2>
      
      {loading && <div className="text-center text-xl text-[#BFA080]">Loading shlokas...</div>}
      
      {error && (
        <div className="text-center text-xl text-red-600 bg-red-100 p-4 rounded-lg">
          Could not load shlokas. Please try again later. (Error: {error})
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-12">
          {Object.keys(shlokasByAdhyay).sort((a, b) => a - b).map((adhyayNum) => (
            <section key={adhyayNum}>
              <h3 className="text-3xl font-semibold text-[#6D4C41] mb-6 border-b-2 border-[#BFA080] pb-2">
                Adhyay {adhyayNum}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {shlokasByAdhyay[adhyayNum].map((shloka) => (
                  <div key={shloka._id} className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
                    <div className="aspect-w-16 aspect-h-9">
                      <iframe
                        src={getYouTubeEmbedUrl(shloka.video_id)}
                        title={`Adhyay ${shloka.adhyay} - Shloka ${shloka.shloka}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-[#6D4C41]">
                        Adhyay {shloka.adhyay}, Shloka {shloka.shloka}
                      </h4>
                      {shloka.text && (
                        <p className="text-gray-700 mt-2 italic">
                          "{shloka.text}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * About Page
 * Corresponds to image_273844.png
 */
function AboutPage() {
  const [about, setAbout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAbout = async () => {
      try {
        const data = await apiFetch('/about');
        setAbout(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAbout();
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-4xl font-bold text-left text-[#D35400] mb-6 font-serif border-b-2 border-[#F39C12] pb-2">
        About Aaradhya
      </h2>
      
      {loading && (
        <div className="flex items-center space-x-4">
          <img 
            src="https://placehold.co/100x100/FFF8E1/BFA080?text=Aaradhya" 
            alt="Aaradhya Soni" 
            className="w-24 h-24 rounded-full shadow-md"
          />
          <span className="text-xl text-[#BFA080]">Loading details...</span>
        </div>
      )}
      
      {error && (
        <div className="text-center text-xl text-red-600 bg-red-100 p-4 rounded-lg">
          Could not load about details. (Error: {error})
        </div>
      )}

      {!loading && !error && about && (
        <div className="flex flex-col md:flex-row items-start gap-8 bg-white p-8 rounded-lg shadow-lg">
          <img 
            src={about.imageUrl || 'https://placehold.co/200x200/FFF8E1/BFA080?text=Aaradhya'} 
            alt="Aaradhya Soni" 
            className="w-48 h-48 rounded-full shadow-xl object-cover flex-shrink-0"
            onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/200x200/FFF8E1/BFA080?text=Image+Error'; }}
          />
          <div className="text-lg text-gray-800 leading-relaxed whitespace-pre-wrap">
            {about.content}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Artwork Page
 */
function ArtworkPage() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArtwork = async () => {
      try {
        const data = await apiFetch('/artwork');
        setArtworks(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchArtwork();
  }, []);
  
  return (
    <div className="container mx-auto p-8">
      <h2 className="text-4xl font-bold text-center text-[#6D4C41] mb-10 font-serif">Artwork Gallery</h2>
      
      {loading && <div className="text-center text-xl text-[#BFA080]">Loading artworks...</div>}
      
      {error && (
        <div className="text-center text-xl text-red-600 bg-red-100 p-4 rounded-lg">
          Could not load artworks. (Error: {error})
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {artworks.map((art) => (
            <div key={art._id} className="bg-white rounded-lg shadow-lg overflow-hidden group transition-all duration-300 hover:shadow-2xl">
              <img 
                src={art.imageUrl} 
                alt={art.title} 
                className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/400x300/FFF8E1/BFA080?text=Image+Error'; }}
              />
              <div className="p-4">
                <h3 className="text-lg font-semibold text-[#6D4C41] truncate">{art.title}</h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Admin Panel Component
 */
function AdminPanel({ password, onForceRefresh }) {
  const [adhyay, setAdhyay] = useState('');
  const [shloka, setShloka] = useState('');
  const [text, setText] = useState('');
  const [videoId, setVideoId] = useState('');

  const [aboutText, setAboutText] = useState('');
  const [aboutImageUrl, setAboutImageUrl] = useState('');

  const [artTitle, setArtTitle] = useState('');
  const [artImageUrl, setArtImageUrl] = useState('');
  
  const [artworks, setArtworks] = useState([]);
  
  const [message, setMessage] = useState({ type: '', text: '' });

  // Fetch current about text and artworks to populate forms
  useEffect(() => {
    apiFetch('/about')
      .then(data => {
        setAboutText(data.content);
        setAboutImageUrl(data.imageUrl);
      })
      .catch(err => console.error("Failed to fetch about data for admin", err));
      
    fetchArtworks();
  }, []);
  
  const fetchArtworks = () => {
    apiFetch('/artwork')
      .then(setArtworks)
      .catch(err => console.error("Failed to fetch artworks for admin", err));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleAddShloka = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/shlokas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          adhyay, 
          shloka, 
          text, 
          video_id: videoId, 
          password 
        }),
      });
      showMessage('success', data.message);
      setAdhyay(''); setShloka(''); setText(''); setVideoId('');
      onForceRefresh('home'); // Refresh home page data
    } catch (err) {
      showMessage('error', err.message);
    }
  };
  
  const handleUpdateAbout = async (e) => {
    e.preventDefault();
    try {
      const data = await apiFetch('/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          newText: aboutText, 
          newImageUrl: aboutImageUrl,
          password 
        }),
      });
      showMessage('success', data.message);
      onForceRefresh('about'); // Refresh about page data
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleAddArtwork = async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/artwork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: artTitle, 
          imageUrl: artImageUrl,
          password 
        }),
      });
      showMessage('success', 'Artwork added!');
      setArtTitle(''); setArtImageUrl('');
      fetchArtworks(); // Re-fetch artworks list
      onForceRefresh('artwork'); // Refresh artwork page data
    } catch (err) {
      showMessage('error', err.message);
    }
  };
  
  const handleDeleteArtwork = async (id) => {
    if (window.confirm('Are you sure you want to delete this artwork?')) {
      try {
        // Updated to use query param for password as per server.js change
        const data = await apiFetch(`/artwork/${id}?password=${encodeURIComponent(password)}`, {
          method: 'DELETE',
        });
        showMessage('success', data.message);
        fetchArtworks(); // Re-fetch artworks list
        onForceRefresh('artwork'); // Refresh artwork page data
      } catch (err) {
        showMessage('error', err.message);
      }
    }
  };
  
  const AdminForm = ({ title, onSubmit, children }) => (
    <form onSubmit={onSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-4">
      <h3 className="text-2xl font-semibold text-[#6D4C41] border-b pb-2">{title}</h3>
      {children}
      <button type="submit" className="w-full bg-[#BFA080] text-white py-2 px-4 rounded-lg hover:bg-[#a98b6c] transition duration-300">
        Submit
      </button>
    </form>
  );
  
  const InputField = ({ label, value, onChange, type = 'text', required = true }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#BFA080] focus:border-[#BFA080] sm:text-sm"
      />
    </div>
  );

  return (
    <div className="container mx-auto p-8">
      <h2 className="text-4xl font-bold text-center text-[#6D4C41] mb-10 font-serif">Admin Panel</h2>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Add Shloka */}
        <AdminForm title="Add New Shloka" onSubmit={handleAddShloka}>
          <InputField label="Adhyay" value={adhyay} onChange={setAdhyay} type="number" />
          <InputField label="Shloka" value={shloka} onChange={setShloka} type="number" />
          <InputField label="Text (Optional)" value={text} onChange={setText} required={false} />
          <InputField label="YouTube Video ID" value={videoId} onChange={setVideoId} />
        </AdminForm>
        
        {/* Update About */}
        <AdminForm title="Update About Section" onSubmit={handleUpdateAbout}>
          <InputField label="Image URL" value={aboutImageUrl} onChange={setAboutImageUrl} />
          <div>
            <label className="block text-sm font-medium text-gray-700">Content</label>
            <textarea
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              required
              rows="6"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#BFA080] focus:border-[#BFA080] sm:text-sm"
            />
          </div>
        </AdminForm>
        
        {/* Add Artwork */}
        <AdminForm title="Add New Artwork" onSubmit={handleAddArtwork}>
          <InputField label="Title" value={artTitle} onChange={setArtTitle} />
          <InputField label="Image URL" value={artImageUrl} onChange={setArtImageUrl} />
        </AdminForm>
        
        {/* Manage Artwork */}
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
          <h3 className="text-2xl font-semibold text-[#6D4C41] border-b pb-2">Manage Artwork</h3>
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
            {artworks.length === 0 && <p className="text-gray-500">No artwork found.</p>}
            {artworks.map(art => (
              <div key={art._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-800 truncate" title={art.title}>{art.title}</span>
                <button 
                  onClick={() => handleDeleteArtwork(art._id)}
                  className="text-red-500 hover:text-red-700 font-medium"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}

/**
 * Admin Login Page
 */
function AdminLoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await apiFetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      onLogin(password); // Pass the password up on successful login
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container mx-auto p-8 flex justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl space-y-6">
        <h2 className="text-3xl font-bold text-center text-[#6D4C41] mb-4 font-serif">Admin Login</h2>
        
        <InputField label="Password" value={password} onChange={setPassword} type="password" />

        {error && (
          <div className="text-red-600 bg-red-100 p-3 rounded-lg text-center">
            {error}
          </div>
        )}
        
        <button type="submit" className="w-full bg-[#BFA080] text-white py-2 px-4 rounded-lg hover:bg-[#a98b6c] transition duration-300 text-lg">
          Login
        </button>
      </form>
    </div>
  );
}


/**
 * Main App Component
 */
export default function App() {
  const [page, setPage] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  
  // This state is used to force a re-fetch in child components
  const [refreshKey, setRefreshKey] = useState({
    home: 0,
    about: 0,
    artwork: 0
  });
  
  const handleLogin = (password) => {
    setAdminPassword(password);
    setIsAdmin(true);
  };
  
  const handleForceRefresh = (pageKey) => {
    setRefreshKey(prev => ({
      ...prev,
      [pageKey]: prev[pageKey] + 1
    }));
  };

  const renderPage = () => {
    switch (page) {
      case 'home':
        return <ShlokasPage key={refreshKey.home} />;
      case 'about':
        return <AboutPage key={refreshKey.about} />;
      case 'artwork':
        return <ArtworkPage key={refreshKey.artwork} />;
      case 'admin':
        return isAdmin ? (
          <AdminPanel password={adminPassword} onForceRefresh={handleForceRefresh} />
        ) : (
          <AdminLoginPage onLogin={handleLogin} />
        );
      default:
        return <ShlokasPage key={refreshKey.home} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] font-sans">
      <Navigation page={page} setPage={setPage} />
      <main>
        {renderPage()}
      </main>
      <footer className="bg-[#FFF8E1] text-center p-6 mt-12 text-[#6D4C41]">
        © {new Date().getFullYear()} Aaradhya's Gita. All rights reserved.
      </footer>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';

function App() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  const [view, setView] = useState('login'); 
  const [user, setUser] = useState(null); 
  const [formData, setFormData] = useState({ full_name: '', matric_number: '', password: '' });
  const [adminData, setAdminData] = useState({ username: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });

  const [firstSemCourses, setFirstSemCourses] = useState([]);
  const [secondSemCourses, setSecondSemCourses] = useState([]);
  const [firstSemSelected, setFirstSemSelected] = useState([]);
  const [secondSemSelected, setSecondSemSelected] = useState([]);
  const [firstSemRegistered, setFirstSemRegistered] = useState([]);
  const [secondSemRegistered, setSecondSemRegistered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCongratulatory, setIsCongratulatory] = useState(false);

  const [adminStudents, setAdminStudents] = useState([]);
  const [selectedStudentForView, setSelectedStudentForView] = useState(null); 
  const [selectedStudentForMsg, setSelectedStudentForMsg] = useState(null);
  const [adminMessageText, setAdminMessageText] = useState('');

  const [filterDept, setFilterDept] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');

  const [showMessagePopup, setShowMessagePopup] = useState(false);

  const [searchQueryFirst, setSearchQueryFirst] = useState('');
  const [searchResultsFirst, setSearchResultsFirst] = useState([]);
  const [searchQuerySecond, setSearchQuerySecond] = useState('');
  const [searchResultsSecond, setSearchResultsSecond] = useState([]);

  const studentCourseFormRef = useRef();
  const studentReceiptRef = useRef();
  const adminCourseFormRef = useRef();
  const adminReceiptRef = useRef();

  const handlePrintStudentCourseForm = useReactToPrint({ contentRef: studentCourseFormRef, documentTitle: `Course_Form_${user?.matric}` });
  const handlePrintStudentReceipt = useReactToPrint({ contentRef: studentReceiptRef, documentTitle: `Receipt_${user?.matric}` });
  const handlePrintAdminCourseForm = useReactToPrint({ contentRef: adminCourseFormRef, documentTitle: `Course_Form_${selectedStudentForView?.matric}` });
  const handlePrintAdminReceipt = useReactToPrint({ contentRef: adminReceiptRef, documentTitle: `Receipt_${selectedStudentForView?.matric}` });

  useEffect(() => {
    const savedUser = localStorage.getItem('custech_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.admin_message) setShowMessagePopup(true);
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      setLoading(true);
      if (user.has_registered) {
        fetch(`${API_URL}/api/register/${user.id}`)
          .then(res => res.json())
          .then(data => { 
            setFirstSemRegistered(data.filter(c => c.semester === 'First'));
            setSecondSemRegistered(data.filter(c => c.semester === 'Second'));
            setLoading(false); 
          });
      } else {
        const encodedDept = encodeURIComponent(user.department);
        Promise.all([
          fetch(`${API_URL}/api/courses?department=${encodedDept}&level=${user.level}&semester=First`).then(res => res.json()),
          fetch(`${API_URL}/api/courses?department=${encodedDept}&level=${user.level}&semester=Second`).then(res => res.json())
        ]).then(([firstData, secondData]) => {
          setFirstSemCourses(firstData);
          setSecondSemCourses(secondData);
          setLoading(false);
        }).catch(err => {
          console.error(err);
          setLoading(false);
        });
      }
    } else if (user && user.role === 'admin') {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = () => {
    setLoading(true);
    fetch(`${API_URL}/api/admin/registrations`)
      .then(res => res.json())
      .then(data => { setAdminStudents(data); setLoading(false); });
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleAdminChange = (e) => setAdminData({ ...adminData, [e.target.name]: e.target.value });

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Processing...', type: 'info' });
    const endpoint = view === 'login' ? '/api/auth/login' : '/api/auth/signup';
    const payload = view === 'login' ? { matric_number: formData.matric_number, password: formData.password } : formData;

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        if (view === 'login') {
          localStorage.setItem('custech_user', JSON.stringify(data.user));
          setUser(data.user);
          if (data.user.admin_message) setShowMessagePopup(true);
        } else {
          setMessage({ text: `Success! Please login.`, type: 'success' });
          setView('login');
        }
      } else setMessage({ text: `Error: ${data.detail}`, type: 'error' });
    } catch (error) { setMessage({ text: 'Failed to connect to server.', type: 'error' }); }
  };

  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: 'Processing...', type: 'info' });
    try {
      const response = await fetch(`${API_URL}/api/auth/admin-login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminData)
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('custech_user', JSON.stringify(data.user));
        setUser(data.user);
      } else setMessage({ text: `Error: ${data.detail}`, type: 'error' });
    } catch (error) { setMessage({ text: 'Failed to connect to server.', type: 'error' }); }
  };

  const handleLogout = () => {
    localStorage.removeItem('custech_user');
    setUser(null); setView('login'); setMessage({ text: '', type: '' });
  };

  const allFirstSelected = firstSemCourses.length > 0 && firstSemSelected.length === firstSemCourses.length;
  const allSecondSelected = secondSemCourses.length > 0 && secondSemSelected.length === secondSemCourses.length;

  const toggleAllFirstSem = () => { if (allFirstSelected) setFirstSemSelected([]); else setFirstSemSelected([...firstSemCourses]); };
  const toggleAllSecondSem = () => { if (allSecondSelected) setSecondSemSelected([]); else setSecondSemSelected([...secondSemCourses]); };

  const toggleFirstSemCourse = (course) => {
    if (firstSemSelected.find(c => c.course_code === course.course_code)) setFirstSemSelected(firstSemSelected.filter(c => c.course_code !== course.course_code));
    else setFirstSemSelected([...firstSemSelected, course]);
  };

  const toggleSecondSemCourse = (course) => {
    if (secondSemSelected.find(c => c.course_code === course.course_code)) setSecondSemSelected(secondSemSelected.filter(c => c.course_code !== course.course_code));
    else setSecondSemSelected([...secondSemSelected, course]);
  };

  const handleRegister = async () => {
    const allSelected = [...firstSemSelected, ...secondSemSelected];
    if (allSelected.length === 0) return alert("Please select at least one course.");
    setMessage({ text: 'Submitting registration...', type: 'info' });
    
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: user.id, course_codes: allSelected.map(c => c.course_code) })
      });
      if (response.ok) {
        const updatedUser = { ...user, has_registered: true };
        localStorage.setItem('custech_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setFirstSemRegistered(firstSemSelected);
        setSecondSemRegistered(secondSemSelected);
        setIsCongratulatory(true);
        setMessage({ text: '', type: '' });
      }
    } catch (error) { setMessage({ text: 'Registration failed.', type: 'error' }); }
  };

  const handleSearchFirst = async (e) => {
    e.preventDefault(); if (!searchQueryFirst) return;
    const encodedDept = encodeURIComponent(user.department);
    const res = await fetch(`${API_URL}/api/courses/search?department=${encodedDept}&query=${searchQueryFirst}&semester=First`);
    const data = await res.json(); setSearchResultsFirst(data);
  };

  const handleSearchSecond = async (e) => {
    e.preventDefault(); if (!searchQuerySecond) return;
    const encodedDept = encodeURIComponent(user.department);
    const res = await fetch(`${API_URL}/api/courses/search?department=${encodedDept}&query=${searchQuerySecond}&semester=Second`);
    const data = await res.json(); setSearchResultsSecond(data);
  };

  const handleDeleteRegistration = async (studentId) => {
    if (!window.confirm("Are you sure you want to delete this student's registration?")) return;
    await fetch(`${API_URL}/api/admin/registrations/${studentId}`, { method: 'DELETE' });
    fetchAdminData();
  };

  const handleSendAdminMessage = async (e) => {
    e.preventDefault();
    await fetch(`${API_URL}/api/admin/send-message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: selectedStudentForMsg.id, message: adminMessageText })
    });
    setSelectedStudentForMsg(null); setAdminMessageText('');
    alert("Message sent successfully!");
  };

  const handleClearMessage = async () => {
    await fetch(`${API_URL}/api/student/clear-message/${user.id}`, { method: 'POST' });
    const updatedUser = { ...user, admin_message: null };
    localStorage.setItem('custech_user', JSON.stringify(updatedUser));
    setUser(updatedUser); setShowMessagePopup(false);
  };

  const renderCourseTable = (courses, selectedList, toggleFunc, allSelected, toggleAll) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
            <th className="p-4 border-b flex items-center gap-2">
              <input type="checkbox" className="w-5 h-5 accent-[#007FFF] cursor-pointer" checked={allSelected} onChange={toggleAll} />
              <span>All</span>
            </th>
            <th className="p-4 border-b">Code</th><th className="p-4 border-b">Course Title</th><th className="p-4 border-b">Units</th><th className="p-4 border-b">Lecturer</th>
          </tr>
        </thead>
        <tbody>
          {courses.map(course => (
            <tr key={course.id || course.course_code} className="hover:bg-blue-50 transition">
              <td className="p-4 border-b">
                <input type="checkbox" className="w-5 h-5 accent-[#007FFF]" checked={selectedList.some(c => c.course_code === course.course_code)} onChange={() => toggleFunc(course)} />
              </td>
              <td className="p-4 border-b font-semibold">{course.course_code}</td><td className="p-4 border-b">{course.course_title}</td>
              <td className="p-4 border-b">{course.units}</td><td className="p-4 border-b text-sm text-gray-500">{course.lecturer}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const totalFirstSemUnits = firstSemRegistered.reduce((sum, c) => sum + c.units, 0);
  const totalSecondSemUnits = secondSemRegistered.reduce((sum, c) => sum + c.units, 0);

  // ==========================================
  // RENDER: STUDENT DASHBOARD
  // ==========================================
  if (user && user.role !== 'admin') {
    if (isCongratulatory) {
      return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-10 rounded-2xl shadow-xl text-center max-w-md w-full border-t-8 border-green-500">
            <h1 className="text-4xl font-bold text-green-600 mb-4">Congratulations!</h1>
            <p className="text-gray-700 mb-6">You have successfully registered for both First and Second semester courses for the 2026/2027 session.</p>
            <button onClick={() => setIsCongratulatory(false)} className="bg-[#7B3F00] text-white py-2 px-6 rounded-lg font-bold w-full hover:bg-[#5A2E00] transition">View My Registered Courses</button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 pb-10">
        <nav className="bg-[#7B3F00] text-white p-4 shadow-md flex justify-between items-center px-4 md:px-8 print:hidden">
          <div className="flex items-center gap-3"><img src="/logo.jpg" alt="Logo" className="w-10 rounded-full" /><h1 className="text-lg md:text-xl font-bold">CUSTECH Portal</h1></div>
          <button onClick={handleLogout} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition">Logout</button>
        </nav>

        {showMessagePopup && user.admin_message && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border-t-8 border-red-500">
              <div className="bg-red-50 p-6 text-center border-b">
                <h2 className="text-2xl font-extrabold text-red-600">IMPORTANT MESSAGE FROM THE ADMIN</h2>
              </div>
              <div className="p-8"><p className="text-gray-700 text-lg leading-relaxed">{user.admin_message}</p></div>
              <div className="p-6 bg-gray-50 flex justify-end">
                <button onClick={handleClearMessage} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-8 rounded-lg shadow-md transition">I Understand & Acknowledge</button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto mt-8 px-4 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#007FFF] mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">Welcome, {user.name}</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-gray-600 font-medium text-sm md:text-base">
              <p>Matric: <span className="text-black uppercase">{user.matric}</span></p>
              <p>Dept: <span className="text-black">{user.department}</span></p>
              <p>Level: <span className="text-black">{user.level}L</span></p>
            </div>
          </div>

          {user.has_registered ? (
             <>
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <button onClick={handlePrintStudentCourseForm} className="bg-[#007FFF] text-white py-3 px-6 rounded-lg font-bold shadow-md hover:bg-blue-700 transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                  Print Course Form
                </button>
                <button onClick={handlePrintStudentReceipt} className="bg-[#008000] text-white py-3 px-6 rounded-lg font-bold shadow-md hover:bg-green-700 transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  Download Registration Receipt
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6 border-t-4 border-green-500 mb-8">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Registered First Semester Courses</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead><tr className="bg-gray-100 text-gray-600 text-sm uppercase"><th className="p-4 border-b">Code</th><th className="p-4 border-b">Title</th><th className="p-4 border-b">Units</th></tr></thead>
                    <tbody>{firstSemRegistered.map(course => (<tr key={course.course_code}><td className="p-4 border-b font-semibold">{course.course_code}</td><td className="p-4 border-b">{course.course_title}</td><td className="p-4 border-b">{course.units}</td></tr>))}</tbody>
                  </table>
                </div>
                <p className="mt-4 font-bold text-right text-lg text-gray-700">First Semester Total Units: {totalFirstSemUnits}</p>
             </div>
             <div className="bg-white rounded-xl shadow-sm overflow-hidden p-6 border-t-4 border-green-500">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Registered Second Semester Courses</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead><tr className="bg-gray-100 text-gray-600 text-sm uppercase"><th className="p-4 border-b">Code</th><th className="p-4 border-b">Title</th><th className="p-4 border-b">Units</th></tr></thead>
                    <tbody>{secondSemRegistered.map(course => (<tr key={course.course_code}><td className="p-4 border-b font-semibold">{course.course_code}</td><td className="p-4 border-b">{course.course_title}</td><td className="p-4 border-b">{course.units}</td></tr>))}</tbody>
                  </table>
                </div>
                <p className="mt-4 font-bold text-right text-lg text-gray-700">Second Semester Total Units: {totalSecondSemUnits}</p>
             </div>
             </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border-t-4 border-[#7B3F00]">
                <div className="bg-gray-50 p-4 border-b"><h3 className="text-lg font-bold text-gray-800">First Semester Courses</h3></div>
                {loading ? <div className="p-10 text-center">Loading...</div> : renderCourseTable(firstSemCourses, firstSemSelected, toggleFirstSemCourse, allFirstSelected, toggleAllFirstSem)}
                {user.level !== 100 && (
                  <div className="bg-red-50 p-4 border-y">
                    <h4 className="text-md font-bold text-red-700 mb-2">Add Outstanding Courses (First Semester)</h4>
                    <form onSubmit={handleSearchFirst} className="flex flex-col md:flex-row gap-4">
                      <input type="text" placeholder="Search by course code or title..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-400" value={searchQueryFirst} onChange={(e) => setSearchQueryFirst(e.target.value)} />
                      <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">Search</button>
                    </form>
                    {searchResultsFirst.length > 0 && (<div className="mt-4 border rounded-lg overflow-hidden bg-white">{searchResultsFirst.map(course => (<div key={course.course_code} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 border-b hover:bg-gray-50 gap-2"><div><p className="font-bold text-sm">{course.course_code} - {course.course_title} ({course.units} Units)</p></div><button onClick={() => toggleFirstSemCourse(course)} className={`px-4 py-1 rounded font-bold text-xs w-full md:w-auto ${firstSemSelected.some(c => c.course_code === course.course_code) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{firstSemSelected.some(c => c.course_code === course.course_code) ? 'Remove' : 'Add'}</button></div>))}</div>)}
                  </div>
                )}
                <div className="p-4 bg-gray-50 flex justify-between items-center"><p className="font-bold text-gray-700 text-lg">First Sem Total Units: {firstSemSelected.reduce((sum, c) => sum + c.units, 0)}</p></div>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border-t-4 border-[#007FFF]">
                <div className="bg-gray-50 p-4 border-b"><h3 className="text-lg font-bold text-gray-800">Second Semester Courses</h3></div>
                {loading ? <div className="p-10 text-center">Loading...</div> : renderCourseTable(secondSemCourses, secondSemSelected, toggleSecondSemCourse, allSecondSelected, toggleAllSecondSem)}
                {user.level !== 100 && (
                  <div className="bg-red-50 p-4 border-y">
                    <h4 className="text-md font-bold text-red-700 mb-2">Add Outstanding Courses (Second Semester)</h4>
                    <form onSubmit={handleSearchSecond} className="flex flex-col md:flex-row gap-4">
                      <input type="text" placeholder="Search by course code or title..." className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-400" value={searchQuerySecond} onChange={(e) => setSearchQuerySecond(e.target.value)} />
                      <button type="submit" className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">Search</button>
                    </form>
                    {searchResultsSecond.length > 0 && (<div className="mt-4 border rounded-lg overflow-hidden bg-white">{searchResultsSecond.map(course => (<div key={course.course_code} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 border-b hover:bg-gray-50 gap-2"><div><p className="font-bold text-sm">{course.course_code} - {course.course_title} ({course.units} Units)</p></div><button onClick={() => toggleSecondSemCourse(course)} className={`px-4 py-1 rounded font-bold text-xs w-full md:w-auto ${secondSemSelected.some(c => c.course_code === course.course_code) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{secondSemSelected.some(c => c.course_code === course.course_code) ? 'Remove' : 'Add'}</button></div>))}</div>)}
                  </div>
                )}
                <div className="p-4 bg-gray-50 flex justify-between items-center"><p className="font-bold text-gray-700 text-lg">Second Sem Total Units: {secondSemSelected.reduce((sum, c) => sum + c.units, 0)}</p></div>
              </div>
              <div className="p-6 bg-white border rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 sticky bottom-4">
                <div><p className="font-bold text-gray-700 text-xl text-center md:text-left">Grand Total Units: {firstSemSelected.reduce((sum, c) => sum + c.units, 0) + secondSemSelected.reduce((sum, c) => sum + c.units, 0)}</p></div>
                <button onClick={handleRegister} className="w-full md:w-auto bg-[#7B3F00] hover:bg-[#5A2E00] text-white font-bold py-3 px-8 rounded-lg shadow-md transition text-lg">Submit Registration</button>
              </div>
            </>
          )}
        </div>

        {/* HIDDEN PRINT COMPONENTS FOR STUDENT */}
        <div className="hidden">
          <div ref={studentCourseFormRef} className="p-10 bg-white text-black font-serif" style={{ width: '210mm', minHeight: '297mm' }}>
            <div className="text-center mb-8 border-b-2 border-gray-800 pb-4 relative"><img src="/logo.jpg" alt="Logo" className="w-24 mx-auto mb-4" /><h1 className="text-2xl font-bold uppercase">Confluence University of Science and Technology (CUSTECH)</h1><h2 className="text-xl mt-2 font-semibold">Osara, Kogi State</h2><h3 className="text-lg font-bold mt-4 uppercase">Course Registration Form - 2026/2027 Session</h3></div>
            <div className="grid grid-cols-2 gap-4 mb-8 text-lg"><p><strong>Name:</strong> {user.name}</p><p><strong>Matric No:</strong> {user.matric}</p><p><strong>Department:</strong> {user.department}</p><p><strong>Level:</strong> {user.level}L</p></div>
            <h4 className="text-xl font-bold mb-2">First Semester</h4>
            <table className="w-full border-collapse border border-gray-800 mb-6 text-sm"><thead><tr className="bg-gray-200"><th className="border border-gray-800 p-2">S/N</th><th className="border border-gray-800 p-2">Course Code</th><th className="border border-gray-800 p-2 text-left">Course Title</th><th className="border border-gray-800 p-2">Units</th></tr></thead><tbody>{firstSemRegistered.map((c, i) => (<tr key={c.course_code}><td className="border border-gray-800 p-2 text-center">{i + 1}</td><td className="border border-gray-800 p-2 text-center">{c.course_code}</td><td className="border border-gray-800 p-2">{c.course_title}</td><td className="border border-gray-800 p-2 text-center">{c.units}</td></tr>))}<tr className="bg-gray-100 font-bold"><td colSpan="3" className="border border-gray-800 p-2 text-right">Total First Semester Units:</td><td className="border border-gray-800 p-2 text-center">{totalFirstSemUnits}</td></tr></tbody></table>
            <h4 className="text-xl font-bold mb-2 mt-8">Second Semester</h4>
            <table className="w-full border-collapse border border-gray-800 mb-6 text-sm"><thead><tr className="bg-gray-200"><th className="border border-gray-800 p-2">S/N</th><th className="border border-gray-800 p-2">Course Code</th><th className="border border-gray-800 p-2 text-left">Course Title</th><th className="border border-gray-800 p-2">Units</th></tr></thead><tbody>{secondSemRegistered.map((c, i) => (<tr key={c.course_code}><td className="border border-gray-800 p-2 text-center">{i + 1}</td><td className="border border-gray-800 p-2 text-center">{c.course_code}</td><td className="border border-gray-800 p-2">{c.course_title}</td><td className="border border-gray-800 p-2 text-center">{c.units}</td></tr>))}<tr className="bg-gray-100 font-bold"><td colSpan="3" className="border border-gray-800 p-2 text-right">Total Second Semester Units:</td><td className="border border-gray-800 p-2 text-center">{totalSecondSemUnits}</td></tr></tbody></table>
            <div className="text-right text-xl font-bold mb-16">Grand Total Units: {totalFirstSemUnits + totalSecondSemUnits}</div>
            <div className="flex justify-between mt-20"><div className="text-center"><div className="border-t border-black w-48 mb-1"></div><p className="font-bold">Student's Signature</p></div><div className="text-center"><div className="border-t border-black w-48 mb-1"></div><p className="font-bold">HOD's Signature & Stamp</p></div></div>
          </div>
        </div>
        <div className="hidden">
          <div ref={studentReceiptRef} className="p-8 bg-white text-black font-sans" style={{ width: '148mm', height: '105mm' }}>
            <div className="border-4 border-[#7B3F00] rounded-xl p-6 h-full flex flex-col relative overflow-hidden"><img src="/logo.jpg" alt="Watermark" className="absolute inset-0 m-auto w-48 opacity-10 pointer-events-none" /><div className="flex justify-between items-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 relative z-10"><div className="flex items-center gap-4"><img src="/logo.jpg" alt="Logo" className="w-12 rounded-full" /><div><h1 className="text-xl font-extrabold text-[#7B3F00]">CUSTECH</h1><p className="text-xs text-gray-500 uppercase tracking-widest">Proof of Registration</p></div></div><div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>VERIFIED</div></div><div className="grid grid-cols-2 gap-y-3 text-sm relative z-10"><div><span className="text-gray-500 text-xs uppercase block">Student Name</span><strong>{user.name}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Matric Number</span><strong className="uppercase">{user.matric}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Department</span><strong>{user.department}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Level</span><strong>{user.level} Level</strong></div></div><div className="mt-auto pt-4 border-t border-gray-200 relative z-10"><div className="flex justify-between items-end"><div><span className="text-gray-500 text-xs uppercase block">Total Units Registered</span><div className="flex gap-4 mt-1"><p className="text-sm font-semibold">1st Sem: <span className="text-[#007FFF] text-lg font-bold">{totalFirstSemUnits}</span></p><p className="text-sm font-semibold">2nd Sem: <span className="text-[#007FFF] text-lg font-bold">{totalSecondSemUnits}</span></p><p className="text-sm font-semibold ml-4">Grand Total: <span className="text-[#7B3F00] text-2xl font-extrabold">{totalFirstSemUnits + totalSecondSemUnits}</span></p></div></div><div className="text-right"><p className="text-xs text-gray-400">Date: {new Date().toLocaleDateString()}</p><p className="text-[10px] text-gray-400 mt-1">Keep this receipt safe.</p></div></div></div></div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: ADMIN DASHBOARD (FIXED FOR MOBILE)
  // ==========================================
  if (user && user.role === 'admin') {
    const filteredStudents = adminStudents.filter(student => {
      const matchDept = filterDept === 'All' || student.department === filterDept;
      const matchLevel = filterLevel === 'All' || student.level === parseInt(filterLevel);
      return matchDept && matchLevel;
    });

    return (
      <div className="min-h-screen bg-gray-100 pb-10">
        <nav className="bg-[#007FFF] text-white p-4 shadow-md flex justify-between items-center px-4 md:px-8 print:hidden">
          <div className="flex items-center gap-3"><img src="/logo.jpg" alt="Logo" className="w-10 rounded-full" /><h1 className="text-lg md:text-xl font-bold">CUSTECH Admin Portal</h1></div>
          <button onClick={handleLogout} className="bg-black/20 hover:bg-black/30 px-4 py-2 rounded-lg text-sm font-semibold transition">Logout</button>
        </nav>

        <div className="max-w-6xl mx-auto mt-8 px-4 print:hidden">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-[#7B3F00] mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">Welcome, {user.name}</h2>
              <p className="text-gray-600 mt-2">Total Registered Students: <span className="font-bold text-[#007FFF]">{adminStudents.length}</span></p>
            </div>
          </div>

          {/* FILTERS - FIXED FOR MOBILE (STACKS VERTICALLY) */}
          <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex flex-col md:flex-row gap-4 md:items-center">
            <span className="font-bold text-gray-700 whitespace-nowrap">Filter By:</span>
            <div className="flex flex-col md:flex-row gap-4 w-full">
              <select className="border p-2 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none w-full md:w-auto" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                <option value="All">All Departments</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Library and Information Science">Library and Information Science</option>
              </select>
              <select className="border p-2 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-400 outline-none w-full md:w-auto" value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
                <option value="All">All Levels</option>
                <option value="100">100 Level</option>
                <option value="200">200 Level</option>
                <option value="300">300 Level</option>
                <option value="400">400 Level</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden p-4 md:p-6">
            <h3 className="text-xl font-bold mb-4">Registered Students ({filteredStudents.length})</h3>
            
            {/* TABLE WRAPPER - FIXED FOR MOBILE HORIZONTAL SCROLL */}
            {loading ? <p>Loading...</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 text-sm uppercase">
                      <th className="p-4 border-b">Name</th>
                      <th className="p-4 border-b">Matric</th>
                      <th className="p-4 border-b">Dept</th>
                      <th className="p-4 border-b">Level</th>
                      <th className="p-4 border-b">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="p-4 border-b font-semibold">{student.name}</td>
                        <td className="p-4 border-b uppercase">{student.matric}</td>
                        <td className="p-4 border-b">{student.department}</td>
                        <td className="p-4 border-b">{student.level}L</td>
                        <td className="p-4 border-b">
                          {/* ACTION BUTTONS - STACKED ON MOBILE, ROW ON DESKTOP */}
                          <div className="flex flex-col md:flex-row gap-2">
                            <button onClick={() => setSelectedStudentForView(student)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold text-sm hover:bg-blue-200 whitespace-nowrap">View & Print</button>
                            <button onClick={() => setSelectedStudentForMsg(student)} className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded font-bold text-sm hover:bg-yellow-200 whitespace-nowrap">Message</button>
                            <button onClick={() => handleDeleteRegistration(student.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold text-sm hover:bg-red-200 whitespace-nowrap">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ADMIN MESSAGE MODAL */}
        {selectedStudentForMsg && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-yellow-500 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">Send Message to {selectedStudentForMsg.name}</h3>
                <button onClick={() => setSelectedStudentForMsg(null)} className="text-white text-2xl font-bold">&times;</button>
              </div>
              <form onSubmit={handleSendAdminMessage} className="p-6">
                <textarea 
                  className="w-full border p-3 rounded-lg h-32 focus:ring-2 focus:ring-yellow-400 outline-none resize-none" 
                  placeholder="Type your message here. E.g., Dear student, you missed CSC231..."
                  value={adminMessageText} onChange={(e) => setAdminMessageText(e.target.value)} required
                ></textarea>
                <div className="mt-4 flex justify-end">
                  <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg transition">Send Message</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADMIN VIEW & PRINT MODAL */}
        {selectedStudentForView && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="bg-[#007FFF] p-6 text-white flex justify-between items-center">
                <div><h2 className="text-2xl font-bold">{selectedStudentForView.name}</h2><p className="text-blue-100 uppercase tracking-widest text-sm">{selectedStudentForView.matric} | {selectedStudentForView.department} | {selectedStudentForView.level}L</p></div>
                <button onClick={() => setSelectedStudentForView(null)} className="text-white hover:text-red-200 text-3xl font-bold">&times;</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <button onClick={handlePrintAdminCourseForm} className="bg-[#007FFF] text-white py-2 px-4 rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg> Print Course Form</button>
                  <button onClick={handlePrintAdminReceipt} className="bg-[#008000] text-white py-2 px-4 rounded font-bold hover:bg-green-700 flex items-center justify-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Print Receipt</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><h4 className="font-bold text-gray-700 mb-2 border-b pb-1">First Semester</h4><ul className="text-sm space-y-1 text-gray-600">{selectedStudentForView.courses.filter(c => c.semester === 'First').map(c => <li key={c.course_code}>{c.course_code} - {c.course_title}</li>)}</ul></div>
                  <div><h4 className="font-bold text-gray-700 mb-2 border-b pb-1">Second Semester</h4><ul className="text-sm space-y-1 text-gray-600">{selectedStudentForView.courses.filter(c => c.semester === 'Second').map(c => <li key={c.course_code}>{c.course_code} - {c.course_title}</li>)}</ul></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HIDDEN PRINT COMPONENTS FOR ADMIN */}
        {selectedStudentForView && (
          <>
            <div className="hidden">
              <div ref={adminCourseFormRef} className="p-10 bg-white text-black font-serif" style={{ width: '210mm', minHeight: '297mm' }}>
                 <div className="text-center mb-8 border-b-2 border-gray-800 pb-4 relative"><img src="/logo.jpg" alt="Logo" className="w-24 mx-auto mb-4" /><h1 className="text-2xl font-bold uppercase">Confluence University of Science and Technology (CUSTECH)</h1><h2 className="text-xl mt-2 font-semibold">Osara, Kogi State</h2><h3 className="text-lg font-bold mt-4 uppercase">Course Registration Form - 2026/2027 Session</h3></div>
                 <div className="grid grid-cols-2 gap-4 mb-8 text-lg"><p><strong>Name:</strong> {selectedStudentForView.name}</p><p><strong>Matric No:</strong> {selectedStudentForView.matric}</p><p><strong>Department:</strong> {selectedStudentForView.department}</p><p><strong>Level:</strong> {selectedStudentForView.level}L</p></div>
                 <h4 className="text-xl font-bold mb-2">First Semester</h4><table className="w-full border-collapse border border-gray-800 mb-6 text-sm"><thead><tr className="bg-gray-200"><th className="border border-gray-800 p-2">S/N</th><th className="border border-gray-800 p-2">Course Code</th><th className="border border-gray-800 p-2 text-left">Course Title</th><th className="border border-gray-800 p-2">Units</th></tr></thead><tbody>{selectedStudentForView.courses.filter(c => c.semester === 'First').map((c, i) => (<tr key={c.course_code}><td className="border border-gray-800 p-2 text-center">{i + 1}</td><td className="border border-gray-800 p-2 text-center">{c.course_code}</td><td className="border border-gray-800 p-2">{c.course_title}</td><td className="border border-gray-800 p-2 text-center">{c.units}</td></tr>))}<tr className="bg-gray-100 font-bold"><td colSpan="3" className="border border-gray-800 p-2 text-right">Total First Semester Units:</td><td className="border border-gray-800 p-2 text-center">{selectedStudentForView.courses.filter(c => c.semester === 'First').reduce((sum, c) => sum + c.units, 0)}</td></tr></tbody></table>
                 <h4 className="text-xl font-bold mb-2 mt-8">Second Semester</h4><table className="w-full border-collapse border border-gray-800 mb-6 text-sm"><thead><tr className="bg-gray-200"><th className="border border-gray-800 p-2">S/N</th><th className="border border-gray-800 p-2">Course Code</th><th className="border border-gray-800 p-2 text-left">Course Title</th><th className="border border-gray-800 p-2">Units</th></tr></thead><tbody>{selectedStudentForView.courses.filter(c => c.semester === 'Second').map((c, i) => (<tr key={c.course_code}><td className="border border-gray-800 p-2 text-center">{i + 1}</td><td className="border border-gray-800 p-2 text-center">{c.course_code}</td><td className="border border-gray-800 p-2">{c.course_title}</td><td className="border border-gray-800 p-2 text-center">{c.units}</td></tr>))}<tr className="bg-gray-100 font-bold"><td colSpan="3" className="border border-gray-800 p-2 text-right">Total Second Semester Units:</td><td className="border border-gray-800 p-2 text-center">{selectedStudentForView.courses.filter(c => c.semester === 'Second').reduce((sum, c) => sum + c.units, 0)}</td></tr></tbody></table>
                 <div className="text-right text-xl font-bold mb-16">Grand Total Units: {selectedStudentForView.courses.reduce((sum, c) => sum + c.units, 0)}</div>
                 <div className="flex justify-between mt-20"><div className="text-center"><div className="border-t border-black w-48 mb-1"></div><p className="font-bold">Student's Signature</p></div><div className="text-center"><div className="border-t border-black w-48 mb-1"></div><p className="font-bold">HOD's Signature & Stamp</p></div></div>
              </div>
            </div>
            <div className="hidden">
              <div ref={adminReceiptRef} className="p-8 bg-white text-black font-sans" style={{ width: '148mm', height: '105mm' }}>
                 <div className="border-4 border-[#7B3F00] rounded-xl p-6 h-full flex flex-col relative overflow-hidden"><img src="/logo.jpg" alt="Watermark" className="absolute inset-0 m-auto w-48 opacity-10 pointer-events-none" /><div className="flex justify-between items-center border-b-2 border-dashed border-gray-300 pb-4 mb-4 relative z-10"><div className="flex items-center gap-4"><img src="/logo.jpg" alt="Logo" className="w-12 rounded-full" /><div><h1 className="text-xl font-extrabold text-[#7B3F00]">CUSTECH</h1><p className="text-xs text-gray-500 uppercase tracking-widest">Proof of Registration</p></div></div><div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-500 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>VERIFIED</div></div><div className="grid grid-cols-2 gap-y-3 text-sm relative z-10"><div><span className="text-gray-500 text-xs uppercase block">Student Name</span><strong>{selectedStudentForView.name}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Matric Number</span><strong className="uppercase">{selectedStudentForView.matric}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Department</span><strong>{selectedStudentForView.department}</strong></div><div><span className="text-gray-500 text-xs uppercase block">Level</span><strong>{selectedStudentForView.level} Level</strong></div></div><div className="mt-auto pt-4 border-t border-gray-200 relative z-10"><div className="flex justify-between items-end"><div><span className="text-gray-500 text-xs uppercase block">Total Units Registered</span><div className="flex gap-4 mt-1"><p className="text-sm font-semibold">1st Sem: <span className="text-[#007FFF] text-lg font-bold">{selectedStudentForView.courses.filter(c => c.semester === 'First').reduce((sum, c) => sum + c.units, 0)}</span></p><p className="text-sm font-semibold">2nd Sem: <span className="text-[#007FFF] text-lg font-bold">{selectedStudentForView.courses.filter(c => c.semester === 'Second').reduce((sum, c) => sum + c.units, 0)}</span></p><p className="text-sm font-semibold ml-4">Grand Total: <span className="text-[#7B3F00] text-2xl font-extrabold">{selectedStudentForView.courses.reduce((sum, c) => sum + c.units, 0)}</span></p></div></div><div className="text-right"><p className="text-xs text-gray-400">Date: {new Date().toLocaleDateString()}</p><p className="text-[10px] text-gray-400 mt-1">Keep this receipt safe.</p></div></div></div></div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER: LOGIN / SIGNUP
  // ==========================================
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-100 p-4">
      <img src="/logo.jpg" alt="Background" className="absolute w-[800px] opacity-5 pointer-events-none select-none" />
      <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/50">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpg" alt="CUSTECH Logo" className="w-20 mb-4" />
          <h1 className="text-xl md:text-2xl font-bold text-[#7B3F00] text-center">CUSTECH Course Registration</h1>
          <p className="text-gray-500 text-sm mt-2 text-center">
            {view === 'login' && 'Welcome back! Please login.'}
            {view === 'signup' && 'Create your student account.'}
            {view === 'admin' && 'Administrator Login'}
          </p>
        </div>
        {view !== 'admin' && (
          <form onSubmit={handleStudentSubmit} className="space-y-5">
            {view === 'signup' && (
              <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" name="full_name" required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007FFF]" onChange={handleChange} /></div>
            )}
            <div><label className="block text-sm font-medium text-gray-700">Matric Number</label><input type="text" name="matric_number" required placeholder="e.g. 23L1FT0363" className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007FFF] uppercase" onChange={handleChange} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" name="password" required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007FFF]" onChange={handleChange} /></div>
            <button type="submit" className="w-full bg-[#7B3F00] hover:bg-[#5A2E00] text-white font-bold py-3 rounded-lg transition duration-200 text-lg shadow-md">{view === 'login' ? 'Login' : 'Sign Up'}</button>
          </form>
        )}
        {view === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700">Admin Username</label><input type="text" name="username" required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007FFF]" onChange={handleAdminChange} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Password</label><input type="password" name="password" required className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007FFF]" onChange={handleAdminChange} /></div>
            <button type="submit" className="w-full bg-[#007FFF] hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition duration-200 text-lg shadow-md">Login as Admin</button>
          </form>
        )}
        {message.text && <div className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${message.type === 'error' ? 'bg-red-100 text-red-700' : message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{message.text}</div>}
        <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col gap-2 items-center text-sm">
          {view === 'login' && <button onClick={() => { setView('signup'); setMessage({text:'', type:''}); }} className="text-[#007FFF] hover:underline text-center">Don't have an account? Sign up</button>}
          {view === 'signup' && <button onClick={() => { setView('login'); setMessage({text:'', type:''}); }} className="text-[#007FFF] hover:underline text-center">Already have an account? Login</button>}
          {view !== 'admin' ? (
            <button onClick={() => { setView('admin'); setMessage({text:'', type:''}); }} className="text-xs text-gray-500 hover:text-[#7B3F00] uppercase tracking-wider font-semibold mt-2">Admin Portal</button>
          ) : (
            <button onClick={() => { setView('login'); setMessage({text:'', type:''}); }} className="text-xs text-gray-500 hover:text-[#7B3F00] uppercase tracking-wider font-semibold mt-2">Back to Student Login</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
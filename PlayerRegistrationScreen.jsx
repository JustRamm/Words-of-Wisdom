import React, { useState } from 'react';
import GameBackground from './GameBackground';
import { supabase } from './supabaseClient';

const PlayerRegistrationScreen = ({ onComplete }) => {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        college: '',
        country: 'India',
        state: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    const INDIAN_STATES = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
        "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
        "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
        "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
        "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", 
        "Lakshadweep", "Puducherry"
    ];

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (submitError) setSubmitError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.age.trim()) newErrors.age = 'Age is required';
        if (!formData.college.trim()) newErrors.college = 'College is required';
        if (!formData.state) newErrors.state = 'State is required';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            // Push to Supabase
            const { error } = await supabase
                .from('players')
                .insert([{
                    name: formData.name,
                    age: parseInt(formData.age),
                    college: formData.college,
                    country: formData.country,
                    state: formData.state,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;
            
            // On success, proceed to the game
            onComplete(formData);
        } catch (err) {
            console.error("Supabase Error:", err.message);
            // Even if it fails (e.g. key missing), we let the user play but log the error
            // Or we can stop them. I'll stop them for now to ensure data is captured.
            setSubmitError("Connectivity issues. Retrying might solve it.");
            // OPTIONAL: Let them proceed if you don't want to block the game
            // onComplete(formData);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-y-auto select-none touch-none"
             style={{ fontFamily: '"Inter", sans-serif' }}>
            
            <GameBackground harmony={50} />

            <div className="relative w-full max-w-lg z-10 animate-scale-in py-8">
                {/* Branding at the top */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-3xl rounded-[2rem] mb-6 flex items-center justify-center border border-white/20 shadow-2xl overflow-hidden -rotate-6 transform hover:rotate-0 transition-all duration-700">
                        <img src="/stickman_assets/logo.svg" alt="Stickman To The Rescue" className="w-12 h-12 object-contain" />
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter text-center leading-none">
                        Player <span className="text-teal-400">Profile</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase tracking-[0.3em] text-[9px] mt-4">India Edition</p>
                </div>

                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-[3rem] shadow-4xl group transition-all duration-500 hover:border-teal-500/30">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your Name"
                                className={`w-full bg-white/5 border-2 ${errors.name ? 'border-red-500/50' : 'border-white/5'} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
                            />
                            {errors.name && <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">Age</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="Age"
                                    className={`w-full bg-white/5 border-2 ${errors.age ? 'border-red-500/50' : 'border-white/5'} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
                                />
                                {errors.age && <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">{errors.age}</p>}
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">Country</label>
                                <input
                                    type="text"
                                    value="India"
                                    disabled
                                    className="w-full bg-white/5 border-2 border-white/5 text-white/30 px-5 py-3.5 rounded-2xl font-bold text-sm cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">College / Institution</label>
                            <input
                                type="text"
                                name="college"
                                value={formData.college}
                                onChange={handleChange}
                                placeholder="Where do you study?"
                                className={`w-full bg-white/5 border-2 ${errors.college ? 'border-red-500/50' : 'border-white/5'} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all placeholder:text-white/10 font-bold text-sm`}
                            />
                            {errors.college && <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">{errors.college}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-[9px] font-black text-teal-400 uppercase tracking-widest ml-4">State / Territory</label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className={`w-full bg-slate-800/80 border-2 ${errors.state ? 'border-red-500/50' : 'border-white/5'} hover:border-teal-500/30 focus:border-teal-500 focus:outline-none text-white px-5 py-3.5 rounded-2xl transition-all font-bold text-sm appearance-none cursor-pointer`}
                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1rem' }}
                            >
                                <option value="" disabled className="text-white/20">Select your state</option>
                                {INDIAN_STATES.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                            </select>
                            {errors.state && <p className="text-red-400 text-[9px] font-bold uppercase tracking-widest ml-4">{errors.state}</p>}
                        </div>

                        {submitError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest text-center">{submitError}</p>}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`group relative w-full overflow-hidden ${isSubmitting ? 'bg-teal-700 cursor-not-allowed' : 'bg-teal-500'} text-white py-4.5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all transform ${isSubmitting ? '' : 'hover:scale-[1.03] active:scale-[0.98]'} shadow-2xl mt-4`}
                        >
                            <span className="relative z-10">{isSubmitting ? 'Saving...' : 'Select Level'}</span>
                            {!isSubmitting && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};



export default PlayerRegistrationScreen;


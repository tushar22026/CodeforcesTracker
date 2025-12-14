const getInfoBtn = document.getElementById('getInfoBtn');
const handleInput = document.getElementById('handleInput');
const errorMsg = document.getElementById('errorMsg');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');

// Profile Elements
const userAvatar = document.getElementById('userAvatar');
const userHandle = document.getElementById('userHandle');
const userRank = document.getElementById('userRank');
const currentRating = document.getElementById('currentRating');
const maxRating = document.getElementById('maxRating');
const friendCount = document.getElementById('friendCount');
const totalSolved = document.getElementById('totalSolved');

// Table Elements
const problemsBody = document.getElementById('problemsBody');

// Rank Colors Mapping
const rankColors = {
    'newbie': '#a0a0a0',
    'pupil': '#008000',
    'specialist': '#03a89e',
    'expert': '#0000ff',
    'candidate master': '#aa00aa',
    'master': '#ff8c00',
    'international master': '#ff8c00',
    'grandmaster': '#ff0035',
    'international grandmaster': '#ff0035',
    'legendary grandmaster': '#ff0035' // Special handling for handled later if needed
};

getInfoBtn.addEventListener('click', () => {
    const handle = handleInput.value.trim();
    if (!handle) return;
    fetchData(handle);
});

handleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const handle = handleInput.value.trim();
        if (!handle) return;
        fetchData(handle);
    }
});

async function fetchData(handle) {
    showLoading(true);
    resetUI();

    try {
        // Fetch User Info
        const userResp = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
        const userData = await userResp.json();

        if (userData.status === 'FAILED') {
            throw new Error('This is a invalid username Please! give me right username for finding information');
        }

        // Fetch User Status (Problems)
        const statusResp = await fetch(`https://codeforces.com/api/user.status?handle=${handle}`);
        const statusData = await statusResp.json();

        if (statusData.status === 'FAILED') {
            throw new Error(statusData.comment || 'Failed to fetch problems');
        }

        renderUserInfo(userData.result[0]);
        renderProblems(statusData.result);
        
        showLoading(false);
        resultSection.classList.remove('hidden');

    } catch (err) {
        showLoading(false);
        showError(err.message);
    }
}

function renderUserInfo(user) {
    userAvatar.src = user.titlePhoto || 'https://userpic.codeforces.org/no-title.jpg';
    userHandle.textContent = user.handle;
    
    // Rank Logic
    const rank = user.rank || 'Unrated';
    userRank.textContent = rank;
    const color = rankColors[rank.toLowerCase()] || '#fff';
    userRank.style.color = color;

    // Handle Legendary Grandmaster first letter black (optional detail, simplifying to red for now or custom HTML)
    if (rank.toLowerCase() === 'legendary grandmaster') {
         // advanced styling could go here, keeping simple color for now
    }

    currentRating.textContent = user.rating || 0;
    maxRating.textContent = user.maxRating || 0;
    friendCount.textContent = user.friendOfCount || 0;
}

function renderProblems(submissions) {
    // Filter passed submissions (verdict OK)
    const solved = submissions.filter(sub => sub.verdict === 'OK');
    
    // Deduplicate by problem name (or id)
    const uniqueSolved = new Map();
    solved.forEach(sub => {
        const id = `${sub.problem.contestId}-${sub.problem.index}`;
        if (!uniqueSolved.has(id)) {
            uniqueSolved.set(id, sub.problem);
        }
    });

    totalSolved.textContent = uniqueSolved.size;

    // Convert to array and maybe sort? Default API return is time desc (newest first)
    const problems = Array.from(uniqueSolved.values());
    // Sort by rating ascending
    problems.sort((a, b) => (a.rating || 0) - (b.rating || 0));

    problemsBody.innerHTML = '';
    
    problems.forEach((prob, index) => {
        const row = document.createElement('tr');
        
        // Tags formatting with click handler
        // Using data attributes and event delegation or direct onclick to avoid escaping hell, 
        // but given simple tags, direct onclick is fine if we attach function to window or use render loop.
        // Let's use a cleaner element creation for the tags cell to handle events properly.
        
        const indexCell = document.createElement('td');
        indexCell.textContent = index + 1;
        
        const nameCell = document.createElement('td');
        nameCell.textContent = prob.name;
        
        const ratingCell = document.createElement('td');
        ratingCell.textContent = prob.rating || '-';
        
        const tagsCell = document.createElement('td');
        prob.tags.forEach(tag => {
            const span = document.createElement('span');
            span.className = 'tag';
            span.textContent = tag;
            span.onclick = (e) => {
                e.stopPropagation(); // Prevent opening the problem
                const query = encodeURIComponent(`competitive programming ${tag} tutorial details`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
            };
            tagsCell.appendChild(span);
        });

        row.appendChild(indexCell);
        row.appendChild(nameCell);
        row.appendChild(ratingCell);
        row.appendChild(tagsCell);

        // Click to open problem
        row.addEventListener('click', () => {
            let url;
            if (prob.contestId) {
                 // Heuristic: contestId < 100000 usually normal contests, > 100000 gym
                 // Actually gym is usually explicitly accessed via gym URL, but standard contest URL often redirects correctly or vice versa.
                 // Safer to check for known gym ranges or just use contest/ for standard.
                 // CF standard: /contest/ID/problem/INDEX
                 // Gym standard: /gym/ID/problem/INDEX
                 // A safe way is to assume contest unless ID is very large, but let's stick to /contest/ for now as it covers most.
                 // Actually, let's just stick to /contest/ if it's not a gym problem.
                 // If contestId > 10000, probably gym?
                 
                 const type = prob.contestId >= 100000 ? 'gym' : 'contest';
                 url = `https://codeforces.com/${type}/${prob.contestId}/problem/${prob.index}`;
                 window.open(url, '_blank');
            }
        });

        problemsBody.appendChild(row);
    });
}

function showLoading(isLoading) {
    if (isLoading) {
        loading.classList.remove('hidden');
        resultSection.classList.add('hidden');
        errorMsg.classList.add('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function resetUI() {
    resultSection.classList.add('hidden');
    errorMsg.classList.add('hidden');
    problemsBody.innerHTML = '';
}

function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
}

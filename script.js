const getInfoBtn = document.getElementById('getInfoBtn');
const handleInput = document.getElementById('handleInput');
const errorMsg = document.getElementById('errorMsg');
const loading = document.getElementById('loading');
const resultSection = document.getElementById('resultSection');

// Profile Elements
const userHandle = document.getElementById('userHandle');
const userRank = document.getElementById('userRank');
const currentRating = document.getElementById('currentRating');
const maxRating = document.getElementById('maxRating');
const friendCount = document.getElementById('friendCount');
const totalSolved = document.getElementById('totalSolved');

// Rating Progression Elements
const ratingTargetSelector = document.getElementById('ratingTargetSelector');
const ratingSort = document.getElementById('ratingSort');
const progressionChartCanvas = document.getElementById('progressionChart');
const progressionStats = document.getElementById('progressionStats');


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
    'legendary grandmaster': '#ff0035'
};

// Rating Progression Config
const REQUIRED_TAGS = {
    // 800: 5 tags
    800: ['implementation', 'math', 'greedy', 'strings', 'brute force'],
    
    // 900: 6 tags
    900: ['implementation', 'math', 'constructive algorithms', 'sortings', 'greedy', 'strings'],
    
    // 1000: 7 tags
    1000: ['implementation', 'math', 'greedy', 'brute force', 'geometry', 'constructive algorithms', 'sortings'],
    
    // 1100: 8 tags
    1100: ['implementation', 'math', 'greedy', 'strings', 'sortings', 'two pointers', 'constructive algorithms', 'brute force'],
    
    // 1200: 9 tags
    1200: ['implementation', 'math', 'greedy', 'brute force', 'strings', 'sortings', 'number theory', 'two pointers', 'binary search'],
    
    // 1300: 10 tags
    1300: ['greedy', 'math', 'implementation', 'sortings', 'number theory', 'brute force', 'dfs and similar', 'binary search', 'constructive algorithms', 'data structures'],
    
    // 1400: 10 tags
    1400: ['greedy', 'math', 'constructive algorithms', 'dfs and similar', 'binary search', 'two pointers', 'dp', 'number theory', 'implementation', 'combinatorics'],
    
    // 1500: 10 tags
    1500: ['greedy', 'math', 'dp', 'binary search', 'dfs and similar', 'graphs', 'number theory', 'data structures', 'constructive algorithms', 'bitmasks'],
    
    // 1600+: Advanced topics (10-12 tags)
    1600: ['dp', 'bitmasks', 'graphs', 'trees', 'binary search', 'geometry', 'combinatorics', 'constructive algorithms', 'data structures', 'number theory', 'divide and conquer'],
    1700: ['dp', 'greedy', 'data structures', 'graphs', 'trees', 'number theory', 'probabilities', 'shortest paths', 'combinatorics', 'constructive algorithms', 'games'],
    1900: ['dp', 'data structures', 'trees', 'graphs', 'matrices', 'string suffix structures', 'dsu', 'number theory', 'games', 'flow', 'string algorithms', 'fft']
};

let currentSolvedTags = new Map();
let chartInstance = null;
let allProblems = [];

getInfoBtn.addEventListener('click', () => {
    const handle = handleInput.value.trim();
    if (!handle) return;
    fetchData(handle);
});

ratingTargetSelector.addEventListener('change', () => {
    updateProgressionUI();
});

ratingSort.addEventListener('change', () => {
    sortAndRenderProblems();
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
        
        const solved = statusData.result.filter(sub => sub.verdict === 'OK');
        const uniqueSolved = new Map();
        solved.forEach(sub => {
            const id = `${sub.problem.contestId}-${sub.problem.index}`;
            if (!uniqueSolved.has(id)) {
                uniqueSolved.set(id, sub.problem);
            }
        });
        
        allProblems = Array.from(uniqueSolved.values());
        totalSolved.textContent = allProblems.length;
        
        sortAndRenderProblems();

        showLoading(false);
        resultSection.classList.remove('hidden');

    } catch (err) {
        showLoading(false);
        showError(err.message);
    }
}

function renderUserInfo(user) {
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

function sortAndRenderProblems() {
    const sortBy = ratingSort.value;
    
    let sortedProblems = [...allProblems];

    if (sortBy === 'asc') {
        sortedProblems.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else {
        sortedProblems.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    renderProblems(sortedProblems);
}

function renderProblems(problems) {
    // Reset current tags count
    currentSolvedTags.clear();
    problemsBody.innerHTML = '';
    
    problems.forEach((prob, index) => {
        const row = document.createElement('tr');
        
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
                e.stopPropagation(); 
                const query = encodeURIComponent(`competitive programming ${tag} tutorial details`);
                window.open(`https://www.google.com/search?q=${query}`, '_blank');
            };
            tagsCell.appendChild(span);

            // Count tags for progression logic
            const currentCount = currentSolvedTags.get(tag) || 0;
            currentSolvedTags.set(tag, currentCount + 1);
        });

        row.appendChild(indexCell);
        row.appendChild(nameCell);
        row.appendChild(ratingCell);
        row.appendChild(tagsCell);

        // Click to open problem
        row.addEventListener('click', () => {
            let url;
            if (prob.contestId) {
                 const type = prob.contestId >= 100000 ? 'gym' : 'contest';
                 url = `https://codeforces.com/${type}/${prob.contestId}/problem/${prob.index}`;
                 window.open(url, '_blank');
            }
        });

        problemsBody.appendChild(row);
    });

    // Update progression after parsing tags
    updateProgressionUI();
}

function updateProgressionUI() {
    const targetRating = parseInt(ratingTargetSelector.value);
    const requiredTagsList = REQUIRED_TAGS[targetRating] || REQUIRED_TAGS[800];
    
    let completedTagsCount = 0;
    const totalRequired = requiredTagsList.length;

    requiredTagsList.forEach(tag => {
        if ((currentSolvedTags.get(tag) || 0) >= 25) {
            completedTagsCount++;
        }
    });

    const completionPercentage = Math.round((completedTagsCount / totalRequired) * 100);
    
    // Update Stats Text
    progressionStats.innerHTML = `
        <p>Target Rating: <strong>${targetRating}</strong></p>
        <p>Completed Tags: <span style="color: var(--primary)">${completedTagsCount}</span> / ${totalRequired}</p>
        <p>Completion: <strong>${completionPercentage}%</strong></p>
    `;

    renderChart(completedTagsCount, totalRequired - completedTagsCount);
}

function renderChart(completed, remaining) {
    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = progressionChartCanvas.getContext('2d');
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [completed, remaining],
                backgroundColor: [
                    '#3b82f6', // Primary Blue
                    'rgba(255, 255, 255, 0.1)' // Empty/Remaining
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: {
                            family: "'Outfit', sans-serif"
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart._metasets[context.datasetIndex].total;
                            const percentage = Math.round((value / total) * 100) + '%';
                            return `${label}: ${value} tags (${percentage})`;
                        }
                    }
                }
            },
            cutout: '70%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
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

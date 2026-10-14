// Global variables - must be initialized first
var storage = null;
var currentTab = 'questions';
var editingId = null;
var searchScope = 'all';

var triStateFilters = {
    curriculum: {},
    feature: { 'Out syl': 'excluded' },
    adminBlank: {},
    partPerformance: {},
    chapter: {},
    publisher: {},
    exam: {},
    qtype: {},
    section: {},
    paper: {},
    concepts: {},
    patterns: {},
    stemPatterns: {},
    ai: {},
    multipleSelection: {},
    graph: {},
    table: {},
    calculation: {}
};
var filterLogic = {
    chapter: 'OR',
    curriculum: 'OR'
};
var paginationState = {
    questions: { page: 1, itemsPerPage: 20 }
};

// Bank load lifecycle for 題目 list (idle|loading|ok|empty|error).
// Keeps load failure distinct from a filtered / empty bank.
var questionsLoadState = {
    status: 'idle',
    message: ''
};


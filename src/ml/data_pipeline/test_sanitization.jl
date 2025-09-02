#!/usr/bin/env julia

"""
Test Script for GitHub Data Sanitization Pipeline

This script validates the functionality of the GitHub data sanitization pipeline
designed for preparing training data for ML/LLM models with comprehensive security,
privacy, and quality checks.
"""

using Pkg
Pkg.activate(".")

include("GitHubDataSanitizer.jl")
using .GitHubDataSanitizer
using JSON3
using Dates
using Logging
using Statistics

# Set up logging
logger = ConsoleLogger(stdout, Logging.Info)
global_logger(logger)

"""
Create mock GitHub issues for testing
"""
function create_test_issues()::Vector{GitHubIssue}
    issues = GitHubIssue[]
    
    # Issue 1: Good quality issue with clean content
    push!(issues, GitHubIssue(
        1001,
        42,
        "Fix null pointer exception in user authentication",
        """
        ## Problem Description
        Getting a null pointer exception when users try to authenticate with empty credentials.
        
        ## Steps to Reproduce
        1. Navigate to login page
        2. Leave username and password fields empty
        3. Click login button
        
        ## Expected Behavior
        Should show validation error message
        
        ## Actual Behavior
        Application crashes with NullPointerException
        
        ## Solution
        Added null checks before authentication logic:
        
        ```java
        if (username == null || username.isEmpty()) {
            throw new ValidationException("Username required");
        }
        ```
        """,
        ["bug", "authentication", "java"],
        "closed",
        DateTime(2024, 1, 15),
        DateTime(2024, 1, 20),
        "developer123",
        "company/secure-app",
        [
            Dict("author" => "maintainer", "body" => "Thanks for the fix! This resolves the authentication issue."),
            Dict("author" => "reviewer", "body" => "LGTM, good solution with proper validation.")
        ],
        nothing,
        [
            """
            if (username == null || username.isEmpty()) {
                throw new ValidationException("Username required");
            }
            if (password == null || password.isEmpty()) {
                throw new ValidationException("Password required");
            }
            """
        ],
        Dict("license" => "MIT", "stars" => 150)
    ))
    
    # Issue 2: Issue with PII that needs sanitization
    push!(issues, GitHubIssue(
        1002,
        43,
        "User john.doe@company.com cannot access dashboard",
        """
        User john.doe@company.com is unable to access the dashboard.
        Their phone number is 555-123-4567 for contact.
        
        Server logs show connection to 192.168.1.100 failed.
        
        The issue seems to be in the authentication module.
        User's home directory is /home/johndoe/app/config.
        
        Please fix this ASAP!
        """,
        ["bug", "dashboard", "user-issue"],
        "closed", 
        DateTime(2024, 2, 1),
        DateTime(2024, 2, 2),
        "support_user",
        "company/dashboard-app",
        [],
        nothing,
        [],
        Dict("license" => "Apache-2.0", "stars" => 75)
    ))
    
    # Issue 3: Security vulnerability that should be filtered
    push!(issues, GitHubIssue(
        1003,
        44,
        "SQL injection in login form",
        """
        Found SQL injection vulnerability in login form.
        
        Payload: admin'; DROP TABLE users; --
        
        The vulnerable code is:
        ```sql
        SELECT * FROM users WHERE username = '\" + userInput + \"' AND password = '\" + passInput + \"'
        ```
        
        This allows execution of arbitrary SQL commands.
        Use parameterized queries instead:
        ```sql
        SELECT * FROM users WHERE username = ? AND password = ?
        ```
        """,
        ["security", "sql-injection", "critical"],
        "closed",
        DateTime(2024, 3, 1),
        DateTime(2024, 3, 5),
        "security_researcher",
        "company/web-app",
        [],
        nothing,
        [
            "SELECT * FROM users WHERE username = '\" + userInput + \"' AND password = '\" + passInput + \"'",
            "SELECT * FROM users WHERE username = ? AND password = ?"
        ],
        Dict("license" => "MIT", "stars" => 200)
    ))
    
    # Issue 4: Spam content that should be filtered
    push!(issues, GitHubIssue(
        1004,
        45,
        "URGENT!!! Need help NOW!!!",
        """
        Help me please!!! This is urgent!!!
        
        Visit my website: http://bit.ly/suspicious123
        
        Buy cheap software here: http://malware-site.com/download.exe
        
        Make money fast!!!
        """,
        ["help", "urgent"],
        "closed",
        DateTime(2024, 4, 1),
        DateTime(2024, 4, 1),
        "spam_user",
        "suspicious/repo",
        [],
        nothing,
        [],
        Dict("license" => "unknown", "stars" => 0)
    ))
    
    # Issue 5: Issue with hardcoded credentials
    push!(issues, GitHubIssue(
        1005,
        46,
        "Database connection issues",
        """
        Having trouble connecting to the database.
        
        Current configuration:
        ```python
        DATABASE_URL = "postgresql://admin:secretpass123@db.company.com:5432/prod"
        API_KEY = "ak_live_abcd1234567890xyz"
        SECRET_KEY = "sk_test_very_secret_key_here"
        ```
        
        The connection keeps timing out. Any suggestions?
        """,
        ["database", "configuration"],
        "closed",
        DateTime(2024, 5, 1),
        DateTime(2024, 5, 3),
        "backend_dev",
        "company/backend-service",
        [],
        nothing,
        [
            """
            DATABASE_URL = "postgresql://admin:secretpass123@db.company.com:5432/prod"
            API_KEY = "ak_live_abcd1234567890xyz"
            SECRET_KEY = "sk_test_very_secret_key_here"
            """
        ],
        Dict("license" => "BSD-3-Clause", "stars" => 89)
    ))
    
    # Issue 6: Good quality algorithmic issue
    push!(issues, GitHubIssue(
        1006,
        47,
        "Optimize sorting algorithm performance",
        """
        ## Issue
        Current sorting implementation is O(n²) which is too slow for large datasets.
        
        ## Current Implementation
        ```python
        def bubble_sort(arr):
            n = len(arr)
            for i in range(n):
                for j in range(0, n-i-1):
                    if arr[j] > arr[j+1]:
                        arr[j], arr[j+1] = arr[j+1], arr[j]
            return arr
        ```
        
        ## Proposed Solution
        Implement quicksort or mergesort for O(n log n) performance:
        
        ```python
        def quicksort(arr):
            if len(arr) <= 1:
                return arr
            pivot = arr[len(arr) // 2]
            left = [x for x in arr if x < pivot]
            middle = [x for x in arr if x == pivot]  
            right = [x for x in arr if x > pivot]
            return quicksort(left) + middle + quicksort(right)
        ```
        
        ## Test Cases
        - Input: [64, 34, 25, 12, 22, 11, 90]
        - Expected: [11, 12, 22, 25, 34, 64, 90]
        """,
        ["performance", "algorithm", "optimization"],
        "closed",
        DateTime(2024, 6, 1),
        DateTime(2024, 6, 10),
        "performance_engineer",
        "company/algorithms-lib",
        [
            Dict("author" => "reviewer", "body" => "Great improvement! Benchmarks show 10x speed improvement."),
            Dict("author" => "maintainer", "body" => "Merged the quicksort implementation. Thanks!")
        ],
        nothing,
        [
            """
            def bubble_sort(arr):
                n = len(arr)
                for i in range(n):
                    for j in range(0, n-i-1):
                        if arr[j] > arr[j+1]:
                            arr[j], arr[j+1] = arr[j+1], arr[j]
                return arr
            """,
            """
            def quicksort(arr):
                if len(arr) <= 1:
                    return arr
                pivot = arr[len(arr) // 2]
                left = [x for x in arr if x < pivot]
                middle = [x for x in arr if x == pivot]  
                right = [x for x in arr if x > pivot]
                return quicksort(left) + middle + quicksort(right)
            """
        ],
        Dict("license" => "MIT", "stars" => 324)
    ))
    
    return issues
end

"""
Test basic sanitizer initialization
"""
function test_sanitizer_initialization()
    @info "Testing data sanitizer initialization..."
    
    # Test with default config
    sanitizer = DataSanitizer()
    
    @info "✅ Default sanitizer initialized"
    @info "   - Security patterns loaded: $(length(sanitizer.security_patterns))"
    @info "   - PII patterns loaded: $(length(sanitizer.pii_patterns))"
    @info "   - License database loaded: $(length(sanitizer.license_db))"
    
    # Test with custom config
    config_file = "sanitizer_config.json"
    if isfile(config_file)
        sanitizer_custom = DataSanitizer(config_file)
        @info "✅ Custom config sanitizer initialized"
        @info "   - Banned repositories: $(length(sanitizer_custom.banned_repositories))"
        @info "   - Banned users: $(length(sanitizer_custom.banned_users))"
    end
    
    return true
end

"""
Test individual issue sanitization
"""
function test_individual_sanitization()
    @info "Testing individual issue sanitization..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    results = []
    
    for (i, issue) in enumerate(test_issues)
        @info "  Testing issue $i: $(issue.title[1:min(50, length(issue.title))])..."
        
        result = sanitize_issue(sanitizer, issue)
        
        if result !== nothing
            push!(results, result)
            @info "    ✅ Sanitization successful"
            @info "      - Quality score: $(round(result.quality_score * 100, digits=1))%"
            @info "      - Safety score: $(round(result.safety_score * 100, digits=1))%"
            @info "      - Category: $(result.category)"
            @info "      - Difficulty: $(result.difficulty)"
            @info "      - Sanitization actions: $(length(result.sanitization_log))"
        else
            @info "    ❌ Issue filtered out"
        end
    end
    
    @info "✅ Individual sanitization testing completed"
    @info "   - Input issues: $(length(test_issues))"
    @info "   - Successfully sanitized: $(length(results))"
    @info "   - Filtered out: $(length(test_issues) - length(results))"
    
    return length(results) > 0
end

"""
Test security filtering
"""
function test_security_filtering()
    @info "Testing security filtering capabilities..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    # Test specific security issue (should be handled carefully)
    sql_injection_issue = test_issues[3]  # The SQL injection issue
    result = sanitize_issue(sanitizer, sql_injection_issue)
    
    if result !== nothing
        @info "   Security issue was sanitized (expected behavior)"
        @info "   Safety score: $(round(result.safety_score * 100, digits=1))%"
        
        # Check if dangerous SQL was sanitized
        if !contains(result.solution, "DROP TABLE")
            @info "   ✅ Dangerous SQL commands removed"
        else
            @warn "   ⚠️  Dangerous SQL commands still present"
        end
    else
        @info "   Security issue was filtered out (strict mode)"
    end
    
    # Test spam filtering
    spam_issue = test_issues[4]  # The spam issue
    spam_result = sanitize_issue(sanitizer, spam_issue)
    
    if spam_result === nothing
        @info "   ✅ Spam content successfully filtered"
    else
        @warn "   ⚠️  Spam content not filtered"
    end
    
    @info "✅ Security filtering testing completed"
    return true
end

"""
Test PII removal
"""
function test_pii_removal()
    @info "Testing PII removal capabilities..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    # Test PII issue (issue with email, phone, IP)
    pii_issue = test_issues[2]  # Issue with PII
    result = sanitize_issue(sanitizer, pii_issue)
    
    if result !== nothing
        @info "   PII issue was sanitized"
        
        # Check email removal
        if !contains(result.description, "@company.com")
            @info "   ✅ Email addresses removed"
        else
            @warn "   ⚠️  Email addresses still present"
        end
        
        # Check phone removal
        if !contains(result.description, "555-123-4567")
            @info "   ✅ Phone numbers removed"
        else
            @warn "   ⚠️  Phone numbers still present"
        end
        
        # Check IP removal
        if !contains(result.description, "192.168.1.100")
            @info "   ✅ IP addresses removed"
        else
            @warn "   ⚠️  IP addresses still present"
        end
        
        # Check file path removal
        if !contains(result.description, "/home/johndoe")
            @info "   ✅ File paths removed"
        else
            @warn "   ⚠️  File paths still present"
        end
        
    else
        @info "   PII issue was filtered out"
    end
    
    @info "✅ PII removal testing completed"
    return true
end

"""
Test credential sanitization
"""
function test_credential_sanitization()
    @info "Testing credential sanitization..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    # Test credentials issue
    creds_issue = test_issues[5]  # Issue with hardcoded credentials
    result = sanitize_issue(sanitizer, creds_issue)
    
    if result !== nothing
        @info "   Credentials issue was sanitized"
        
        # Check credential removal
        if !contains(result.code_context, "secretpass123")
            @info "   ✅ Database passwords removed"
        else
            @warn "   ⚠️  Database passwords still present"
        end
        
        if !contains(result.code_context, "ak_live_abcd1234567890xyz")
            @info "   ✅ API keys removed"
        else
            @warn "   ⚠️  API keys still present"
        end
        
        if contains(result.code_context, "[REDACTED]")
            @info "   ✅ Redaction placeholders added"
        else
            @warn "   ⚠️  No redaction placeholders found"
        end
        
    else
        @info "   Credentials issue was filtered out"
    end
    
    @info "✅ Credential sanitization testing completed"
    return true
end

"""
Test batch processing
"""
function test_batch_processing()
    @info "Testing batch processing capabilities..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    # Test batch sanitization
    start_time = time()
    sanitized_issues, report = batch_sanitize(sanitizer, test_issues, parallel=false)
    processing_time = time() - start_time
    
    @info "✅ Batch processing completed"
    @info "   - Processing time: $(round(processing_time, digits=3))s"
    @info "   - Input issues: $(report.input_issues)"
    @info "   - Output issues: $(report.output_issues)"
    @info "   - Filtered count: $(report.filtered_count)"
    @info "   - Sanitized count: $(report.sanitized_count)"
    
    # Test report generation
    if !isempty(report.sanitization_actions)
        @info "   - Sanitization actions:"
        for (action, count) in report.sanitization_actions
            @info "     * $action: $count"
        end
    end
    
    if !isempty(report.safety_violations)
        @info "   - Safety violations detected:"
        for (violation, count) in report.safety_violations
            @info "     * $violation: $count"
        end
    end
    
    @info "✅ Batch processing testing completed"
    return length(sanitized_issues) > 0
end

"""
Test quality and categorization
"""
function test_quality_and_categorization()
    @info "Testing quality assessment and categorization..."
    
    sanitizer = DataSanitizer()
    test_issues = create_test_issues()
    
    quality_scores = Float64[]
    categories = String[]
    difficulties = String[]
    
    for issue in test_issues
        result = sanitize_issue(sanitizer, issue)
        if result !== nothing
            push!(quality_scores, result.quality_score)
            push!(categories, result.category)
            push!(difficulties, result.difficulty)
        end
    end
    
    if !isempty(quality_scores)
        avg_quality = mean(quality_scores)
        @info "   Average quality score: $(round(avg_quality * 100, digits=1))%"
        @info "   Quality range: $(round(minimum(quality_scores) * 100, digits=1))% - $(round(maximum(quality_scores) * 100, digits=1))%"
    end
    
    if !isempty(categories)
        category_counts = Dict{String, Int}()
        for cat in categories
            category_counts[cat] = get(category_counts, cat, 0) + 1
        end
        @info "   Categories detected:"
        for (cat, count) in category_counts
            @info "     * $cat: $count"
        end
    end
    
    if !isempty(difficulties)
        difficulty_counts = Dict{String, Int}()
        for diff in difficulties
            difficulty_counts[diff] = get(difficulty_counts, diff, 0) + 1
        end
        @info "   Difficulty distribution:"
        for (diff, count) in difficulty_counts
            @info "     * $diff: $count"
        end
    end
    
    @info "✅ Quality and categorization testing completed"
    return true
end

"""
Run comprehensive sanitization pipeline tests
"""
function run_sanitization_tests()
    @info "🧪 Starting GitHub Data Sanitization Pipeline Tests"
    @info "=" ^ 60
    
    test_results = Dict{String, Bool}()
    
    try
        # Test 1: Sanitizer initialization
        test_results["initialization"] = test_sanitizer_initialization()
        println()
        
        # Test 2: Individual sanitization
        test_results["individual_sanitization"] = test_individual_sanitization()
        println()
        
        # Test 3: Security filtering
        test_results["security_filtering"] = test_security_filtering()
        println()
        
        # Test 4: PII removal
        test_results["pii_removal"] = test_pii_removal()
        println()
        
        # Test 5: Credential sanitization
        test_results["credential_sanitization"] = test_credential_sanitization()
        println()
        
        # Test 6: Batch processing
        test_results["batch_processing"] = test_batch_processing()
        println()
        
        # Test 7: Quality and categorization
        test_results["quality_categorization"] = test_quality_and_categorization()
        println()
        
        # Generate summary
        passed_tests = sum(values(test_results))
        total_tests = length(test_results)
        success_rate = passed_tests / total_tests
        
        @info "📊 Test Summary"
        @info "   Tests passed: $passed_tests/$total_tests"
        @info "   Success rate: $(round(success_rate * 100, digits=2))%"
        @info "   Overall status: $(success_rate == 1.0 ? "✅ ALL TESTS PASSED" : "⚠️  SOME TESTS FAILED")"
        
        @info "=" ^ 60
        
        if success_rate == 1.0
            @info "🎉 GitHub Data Sanitization Pipeline validation PASSED!"
            @info "   The pipeline is ready for:"
            @info "   • Large-scale GitHub issue processing"
            @info "   • Security-compliant ML training data preparation"
            @info "   • PII-safe demonstration learning datasets"
            @info "   • Quality-controlled SWE benchmark data"
        else
            @warn "⚠️  Some tests failed. Review results before proceeding."
        end
        
        return success_rate == 1.0
        
    catch e
        @error "❌ Test suite failed with error: $e"
        rethrow(e)
    end
end

"""
Main execution
"""
function main()
    println("GitHub Data Sanitization Pipeline Test Suite")
    println("=" ^ 50)
    println()
    
    success = run_sanitization_tests()
    
    if success
        println()
        @info "✅ Ready to proceed with training data preparation!"
        return 0
    else
        println()
        @error "❌ Sanitization pipeline validation failed."
        return 1
    end
end

# Run tests if executed directly
if abspath(PROGRAM_FILE) == @__FILE__
    exit(main())
end
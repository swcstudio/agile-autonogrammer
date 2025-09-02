"""
GitHub Training Data Sanitization Pipeline

This module provides comprehensive sanitization and filtering capabilities for GitHub issues
used in ML/LLM training. It ensures data quality, security, and compliance while preparing
demonstration data for the SWC-Agent and SWE-REX methodologies.

Key Features:
- Security vulnerability detection and removal
- License compliance validation
- PII and sensitive data removal
- Code quality filtering
- Malicious content detection
- Data provenance tracking
"""

module GitHubDataSanitizer

using JSON3
using DataFrames
using Statistics
using Dates
using SHA
using Base.Threads
using Logging
using HTTP
using Tar
using Downloads

export GitHubIssue, SanitizedIssue, SanitizationReport, DataSanitizer
export sanitize_issue, batch_sanitize, validate_license_compliance
export detect_malicious_content, remove_sensitive_data, assess_code_quality
export create_sanitization_pipeline, generate_sanitization_report

"""
Raw GitHub issue structure
"""
struct GitHubIssue
    id::Int
    number::Int
    title::String
    body::String
    labels::Vector{String}
    state::String
    created_at::DateTime
    updated_at::DateTime
    author::String
    repository::String
    comments::Vector{Dict{String, Any}}
    pull_request::Union{Dict{String, Any}, Nothing}
    code_snippets::Vector{String}
    metadata::Dict{String, Any}
end

"""
Sanitized issue ready for training
"""
struct SanitizedIssue
    original_id::Int
    sanitized_id::String  # SHA-based anonymous ID
    title::String         # Cleaned title
    description::String   # Sanitized description
    solution::String      # Sanitized solution/resolution
    category::String      # Issue category (bug, feature, security, etc.)
    difficulty::String    # Estimated difficulty level
    code_context::String  # Relevant code context
    test_cases::Vector{String}  # Associated test cases
    tags::Vector{String}  # Cleaned tags
    quality_score::Float64     # Quality assessment score
    safety_score::Float64      # Safety assessment score
    provenance::Dict{String, Any}  # Data provenance information
    sanitization_log::Vector{String}  # Log of sanitization actions
end

"""
Sanitization results and metrics
"""
struct SanitizationReport
    input_issues::Int
    output_issues::Int
    filtered_count::Int
    sanitized_count::Int
    quality_distribution::Dict{String, Int}
    safety_violations::Dict{String, Int}
    license_violations::Int
    processing_time::Float64
    data_provenance::Dict{String, Any}
    sanitization_actions::Dict{String, Int}
end

"""
Main data sanitization orchestrator
"""
struct DataSanitizer
    config::Dict{String, Any}
    security_patterns::Dict{String, Vector{Regex}}
    pii_patterns::Vector{Regex}
    license_db::Dict{String, Any}
    quality_thresholds::Dict{String, Float64}
    banned_repositories::Set{String}
    banned_users::Set{String}
end

"""
Initialize data sanitizer with comprehensive security and quality checks
"""
function DataSanitizer(config_path::String="")
    config = if isempty(config_path)
        default_sanitizer_config()
    else
        json_config = JSON3.read(config_path)
        Dict(String(k) => v for (k, v) in json_config)
    end
    
    security_patterns = load_security_patterns()
    pii_patterns = load_pii_patterns()
    license_db = load_license_database()
    quality_thresholds = Dict(
        "min_description_length" => 50.0,
        "min_code_quality" => 0.6,
        "max_complexity" => 0.8,
        "min_clarity" => 0.5
    )
    
    banned_repos = Set(get(config, "banned_repositories", String[]))
    banned_users = Set(get(config, "banned_users", String[]))
    
    return DataSanitizer(
        config,
        security_patterns,
        pii_patterns,
        license_db,
        quality_thresholds,
        banned_repos,
        banned_users
    )
end

"""
Load security vulnerability patterns for detection
"""
function load_security_patterns()::Dict{String, Vector{Regex}}
    return Dict(
        "sql_injection" => [
            r"(?i)(?:union|select|insert|update|delete|drop|create|alter)\s+.*(?:from|into|table|database)",
            r"(?i)(?:exec|execute)\s*\(\s*['\"].*['\"]",
            r"(?i)(?:or|and)\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?",
            r"(?i)['\"];\s*(?:drop|delete|update|insert)",
        ],
        
        "xss" => [
            r"(?i)<script[^>]*>.*?</script>",
            r"(?i)javascript:\s*[^;]+",
            r"(?i)on(?:click|load|error|mouse\w+)\s*=",
            r"(?i)eval\s*\(\s*['\"][^'\"]*['\"]",
        ],
        
        "command_injection" => [
            r"(?i)(?:system|exec|popen|subprocess)\s*\([^)]*(?:\$|`)",
            r"(?i)(?:rm|del|format|mkfs)\s+(?:-rf|\*|/)",
            r"(?i)(?:cat|type)\s+(?:/etc/passwd|/etc/shadow|con:)",
            r"(?i)(?:wget|curl)\s+[^;]*(?:;|&&|\|\|)",
        ],
        
        "path_traversal" => [
            r"(?:\.\.[\\/]){2,}",
            r"(?i)(?:etc|windows|system32)[\\/]",
            r"(?i)[\\/](?:proc|sys|dev)[\\/]",
        ],
        
        "code_execution" => [
            r"(?i)eval\s*\(",
            r"(?i)exec\s*\(",
            r"(?i)(?:__import__|getattr|setattr)\s*\(",
            r"(?i)compile\s*\([^)]*['\"][^'\"]*['\"]",
        ],
        
        "sensitive_data_exposure" => [
            r"(?i)(?:password|pwd|pass)\s*[:=]\s*['\"][^'\"]{3,}['\"]",
            r"(?i)(?:api_?key|token|secret)\s*[:=]\s*['\"][a-zA-Z0-9]{8,}['\"]",
            r"(?i)(?:database|db)_?(?:password|pass|pwd)\s*[:=]",
            r"(?i)(?:private_?key|ssh_?key)\s*[:=]",
        ]
    )
end

"""
Load PII detection patterns
"""
function load_pii_patterns()::Vector{Regex}
    return [
        # Email addresses
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        
        # Phone numbers (various formats)
        r"\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b",
        r"\b\d{3}-\d{2}-\d{4}\b",  # SSN-like patterns
        
        # IP addresses
        r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b",
        
        # Credit card patterns
        r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b",
        
        # Personal names in specific contexts
        r"(?i)(?:my name is|i am|signed by)\s+[A-Z][a-z]+\s+[A-Z][a-z]+",
        
        # Home addresses
        r"\b\d+\s+[A-Za-z0-9\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b",
    ]
end

"""
Load software license database
"""
function load_license_database()::Dict{String, Any}
    # This would typically load from a comprehensive license database
    # For now, we'll use a simplified version
    return Dict(
        "permissive" => ["MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC"],
        "copyleft" => ["GPL-3.0", "GPL-2.0", "LGPL-3.0", "LGPL-2.1", "AGPL-3.0"],
        "commercial" => ["Commercial", "Proprietary"],
        "unknown" => ["None", "Unlicense", "WTFPL"],
        "incompatible" => ["CC-BY-NC", "CC-BY-SA", "Custom"]
    )
end

"""
Sanitize a single GitHub issue
"""
function sanitize_issue(sanitizer::DataSanitizer, issue::GitHubIssue)::Union{SanitizedIssue, Nothing}
    sanitization_log = String[]
    
    try
        # Step 1: Basic filtering
        if !passes_basic_filters(sanitizer, issue, sanitization_log)
            return nothing
        end
        
        # Step 2: License compliance check
        if !validate_license_compliance(sanitizer, issue, sanitization_log)
            return nothing
        end
        
        # Step 3: Security screening
        if !passes_security_screening(sanitizer, issue, sanitization_log)
            return nothing
        end
        
        # Step 4: Remove sensitive data
        clean_title, clean_body = remove_sensitive_data(sanitizer, issue, sanitization_log)
        
        # Step 5: Extract and sanitize code snippets
        sanitized_code = sanitize_code_snippets(sanitizer, issue.code_snippets, sanitization_log)
        
        # Step 6: Quality assessment
        quality_score = assess_content_quality(clean_title, clean_body, join(sanitized_code, "\n\n"))
        
        # Step 7: Safety assessment
        safety_score = assess_content_safety(sanitizer, clean_title, clean_body, join(sanitized_code, "\n\n"))
        
        # Step 8: Categorization
        category = categorize_issue(issue, clean_title, clean_body)
        difficulty = estimate_difficulty(clean_title, clean_body, join(sanitized_code, "\n\n"))
        
        # Step 9: Generate anonymous ID
        sanitized_id = generate_anonymous_id(issue)
        
        # Step 10: Create sanitized issue
        return SanitizedIssue(
            issue.id,
            sanitized_id,
            clean_title,
            clean_body,
            extract_solution(issue, clean_body),
            category,
            difficulty,
            join(sanitized_code, "\n\n"),
            extract_test_cases(issue),
            extract_tags(issue, sanitization_log),
            quality_score,
            safety_score,
            create_provenance_record(issue),
            sanitization_log
        )
        
    catch e
        push!(sanitization_log, "ERROR: $(string(e))")
        @warn "Failed to sanitize issue $(issue.id)" exception=e
        return nothing
    end
end

"""
Check if issue passes basic filtering criteria
"""
function passes_basic_filters(sanitizer::DataSanitizer, issue::GitHubIssue, log::Vector{String})::Bool
    # Repository blacklist check
    if issue.repository in sanitizer.banned_repositories
        push!(log, "FILTERED: Repository in blacklist")
        return false
    end
    
    # Author blacklist check
    if issue.author in sanitizer.banned_users
        push!(log, "FILTERED: Author in blacklist")
        return false
    end
    
    # Minimum content length
    if length(issue.body) < get(sanitizer.config, "min_body_length", 50)
        push!(log, "FILTERED: Body too short")
        return false
    end
    
    # Issue must be closed (for training purposes)
    if issue.state != "closed"
        push!(log, "FILTERED: Issue not closed")
        return false
    end
    
    # Check for spam indicators
    if is_spam_content(issue.title, issue.body)
        push!(log, "FILTERED: Detected as spam")
        return false
    end
    
    push!(log, "PASSED: Basic filtering")
    return true
end

"""
Validate license compliance for training data usage
"""
function validate_license_compliance(sanitizer::DataSanitizer, issue::GitHubIssue, log::Vector{String})::Bool
    # For demonstration learning, we need permissive licenses
    repo_license = get(issue.metadata, "license", "unknown")
    
    # Check if license allows ML training
    permissive_licenses = sanitizer.license_db["permissive"]
    if repo_license in permissive_licenses
        push!(log, "PASSED: License compliance ($repo_license)")
        return true
    end
    
    # Special handling for educational/research purposes
    if get(sanitizer.config, "allow_research_use", false)
        research_compatible = ["GPL-3.0", "GPL-2.0", "Academic", "Educational"]
        if repo_license in research_compatible
            push!(log, "PASSED: Research use license ($repo_license)")
            return true
        end
    end
    
    push!(log, "FILTERED: License not compatible ($repo_license)")
    return false
end

"""
Security screening for malicious content
"""
function passes_security_screening(sanitizer::DataSanitizer, issue::GitHubIssue, log::Vector{String})::Bool
    combined_text = issue.title * "\n" * issue.body * "\n" * join(issue.code_snippets, "\n")
    
    # Check for security vulnerabilities
    for (vuln_type, patterns) in sanitizer.security_patterns
        for pattern in patterns
            matches = collect(eachmatch(pattern, combined_text))
            if !isempty(matches)
                if get(sanitizer.config, "strict_security", true)
                    push!(log, "FILTERED: Security violation ($vuln_type)")
                    return false
                else
                    push!(log, "WARNING: Security pattern detected ($vuln_type)")
                end
            end
        end
    end
    
    # Check for malicious URLs
    if contains_malicious_urls(combined_text)
        push!(log, "FILTERED: Malicious URLs detected")
        return false
    end
    
    # Check for executable content
    if contains_executable_content(combined_text)
        push!(log, "FILTERED: Executable content detected")
        return false
    end
    
    push!(log, "PASSED: Security screening")
    return true
end

"""
Remove PII and sensitive information
"""
function remove_sensitive_data(sanitizer::DataSanitizer, issue::GitHubIssue, log::Vector{String})::Tuple{String, String}
    clean_title = issue.title
    clean_body = issue.body
    
    # Remove PII patterns
    for pattern in sanitizer.pii_patterns
        # Replace emails with placeholder
        if occursin(r"@[A-Za-z0-9.-]+", pattern.pattern)
            clean_title = replace(clean_title, pattern => "[EMAIL_REDACTED]")
            clean_body = replace(clean_body, pattern => "[EMAIL_REDACTED]")
            push!(log, "SANITIZED: Email addresses")
        
        # Replace phone numbers
        elseif occursin(r"\d{3}[-.\s]?\d{3}[-.\s]?\d{4}", pattern.pattern)
            clean_title = replace(clean_title, pattern => "[PHONE_REDACTED]")
            clean_body = replace(clean_body, pattern => "[PHONE_REDACTED]")
            push!(log, "SANITIZED: Phone numbers")
        
        # Replace IP addresses
        elseif occursin(r"\d+\.\d+\.\d+\.\d+", pattern.pattern)
            clean_title = replace(clean_title, pattern => "[IP_REDACTED]")
            clean_body = replace(clean_body, pattern => "[IP_REDACTED]")
            push!(log, "SANITIZED: IP addresses")
        
        # Generic PII removal
        else
            clean_title = replace(clean_title, pattern => "[PII_REDACTED]")
            clean_body = replace(clean_body, pattern => "[PII_REDACTED]")
            push!(log, "SANITIZED: PII data")
        end
    end
    
    # Remove hardcoded credentials
    credential_patterns = [
        r"(?i)(?:password|pwd|pass)\s*[:=]\s*['\"][^'\"]+['\"]" => "[PASSWORD_REDACTED]",
        r"(?i)(?:api_?key|token)\s*[:=]\s*['\"][a-zA-Z0-9]+['\"]" => "[API_KEY_REDACTED]",
        r"(?i)(?:secret|private_?key)\s*[:=]\s*['\"][^'\"]+['\"]" => "[SECRET_REDACTED]"
    ]
    
    for (pattern, replacement) in credential_patterns
        clean_title = replace(clean_title, pattern => replacement)
        clean_body = replace(clean_body, pattern => replacement)
    end
    
    # Remove absolute file paths
    clean_title = replace(clean_title, r"(?:[C-Z]:\\|/home/|/Users/)[^\s\"'<>|]*" => "[PATH_REDACTED]")
    clean_body = replace(clean_body, r"(?:[C-Z]:\\|/home/|/Users/)[^\s\"'<>|]*" => "[PATH_REDACTED]")
    
    if clean_title != issue.title || clean_body != issue.body
        push!(log, "SANITIZED: Removed sensitive data")
    end
    
    return clean_title, clean_body
end

"""
Sanitize code snippets within issues
"""
function sanitize_code_snippets(sanitizer::DataSanitizer, code_snippets::Vector{String}, log::Vector{String})::Vector{String}
    sanitized_snippets = String[]
    
    for snippet in code_snippets
        # Remove comments that might contain sensitive info
        clean_snippet = remove_sensitive_comments(snippet)
        
        # Remove hardcoded credentials
        clean_snippet = remove_hardcoded_credentials(clean_snippet)
        
        # Validate code safety
        if is_safe_code(clean_snippet)
            push!(sanitized_snippets, clean_snippet)
        else
            push!(log, "FILTERED: Unsafe code snippet")
        end
    end
    
    if length(sanitized_snippets) < length(code_snippets)
        push!(log, "SANITIZED: Filtered $(length(code_snippets) - length(sanitized_snippets)) unsafe code snippets")
    end
    
    return sanitized_snippets
end

"""
Assess content quality for training suitability
"""
function assess_content_quality(title::String, body::String, code::String)::Float64
    quality_score = 0.0
    
    # Length and detail (0-0.25)
    if length(body) > 100
        quality_score += 0.1
    end
    if length(body) > 300
        quality_score += 0.1
    end
    if !isempty(code)
        quality_score += 0.05
    end
    
    # Structure and formatting (0-0.25)
    if contains(body, r"##?|Steps|Problem|Solution|Expected|Actual")
        quality_score += 0.1
    end
    if contains(body, r"```|`.*`")  # Code blocks
        quality_score += 0.1
    end
    if count(r"\n\n", body) >= 2  # Paragraphs
        quality_score += 0.05
    end
    
    # Technical content (0-0.25)
    tech_keywords = ["error", "exception", "bug", "fix", "implement", "function", "method", "class"]
    tech_matches = sum(contains(lowercase(title * " " * body), keyword) for keyword in tech_keywords)
    quality_score += min(0.25, tech_matches * 0.05)
    
    # Clarity and completeness (0-0.25)
    if !contains(lowercase(title), r"help|please|urgent|asap")  # Not a help request
        quality_score += 0.05
    end
    if contains(body, r"(?i)(?:reproduce|steps|example)")
        quality_score += 0.1
    end
    if contains(body, r"(?i)(?:solved|fixed|resolved|solution)")
        quality_score += 0.1
    end
    
    return min(1.0, quality_score)
end

"""
Assess content safety for training
"""
function assess_content_safety(sanitizer::DataSanitizer, title::String, body::String, code::String)::Float64
    safety_score = 1.0
    combined_text = title * "\n" * body * "\n" * code
    
    # Security vulnerability patterns (penalties)
    for (vuln_type, patterns) in sanitizer.security_patterns
        for pattern in patterns
            if occursin(pattern, combined_text)
                safety_score -= 0.2
                break
            end
        end
    end
    
    # Harmful content patterns
    harmful_patterns = [
        r"(?i)(?:hack|crack|exploit|backdoor|malware)",
        r"(?i)(?:ddos|dos\s+attack|flood)",
        r"(?i)(?:phish|scam|fraud)",
        r"(?i)(?:bypass|circumvent|evade).*(?:security|auth|protection)"
    ]
    
    for pattern in harmful_patterns
        if occursin(pattern, combined_text)
            safety_score -= 0.15
        end
    end
    
    # Dangerous system operations
    dangerous_ops = [
        r"(?i)(?:rm\s+-rf|del\s+/s|format\s+c:)",
        r"(?i)(?:shutdown|reboot).*(?:force|immediate)",
        r"(?i)chmod\s+777|icacls.*full"
    ]
    
    for pattern in dangerous_ops
        if occursin(pattern, combined_text)
            safety_score -= 0.3
        end
    end
    
    return max(0.0, safety_score)
end

"""
Generate comprehensive sanitization report
"""
function generate_sanitization_report(
    input_count::Int,
    output_count::Int,
    sanitization_logs::Vector{Vector{String}},
    processing_time::Float64
)::SanitizationReport
    
    filtered_count = input_count - output_count
    sanitized_count = sum(length(log) > 1 for log in sanitization_logs)  # More than basic filtering
    
    # Analyze sanitization actions
    action_counts = Dict{String, Int}()
    for log in sanitization_logs
        for entry in log
            if startswith(entry, "SANITIZED:")
                action_type = split(entry, ":")[2] |> strip
                action_counts[action_type] = get(action_counts, action_type, 0) + 1
            end
        end
    end
    
    # Analyze safety violations
    safety_violations = Dict{String, Int}()
    for log in sanitization_logs
        for entry in log
            if startswith(entry, "FILTERED:") && contains(entry, "Security")
                violation_type = split(entry, "(")[end] |> s -> replace(s, ")" => "")
                safety_violations[violation_type] = get(safety_violations, violation_type, 0) + 1
            end
        end
    end
    
    return SanitizationReport(
        input_count,
        output_count,
        filtered_count,
        sanitized_count,
        Dict("high" => 0, "medium" => 0, "low" => 0),  # Would be calculated from quality scores
        safety_violations,
        0,  # License violations count
        processing_time,
        Dict("source" => "GitHub", "processing_date" => string(now())),
        action_counts
    )
end

"""
Batch sanitization with parallel processing
"""
function batch_sanitize(
    sanitizer::DataSanitizer,
    issues::Vector{GitHubIssue};
    parallel::Bool=true
)::Tuple{Vector{SanitizedIssue}, SanitizationReport}
    
    @info "Starting batch sanitization of $(length(issues)) GitHub issues"
    start_time = time()
    
    sanitized_issues = Vector{SanitizedIssue}()
    sanitization_logs = Vector{Vector{String}}()
    
    if parallel && nthreads() > 1
        @info "Using parallel processing with $(nthreads()) threads"
        
        results = Vector{Union{SanitizedIssue, Nothing}}(undef, length(issues))
        logs = Vector{Vector{String}}(undef, length(issues))
        
        @threads for i in 1:length(issues)
            result = sanitize_issue(sanitizer, issues[i])
            results[i] = result
            logs[i] = result !== nothing ? result.sanitization_log : ["FILTERED: Failed sanitization"]
        end
        
        # Collect successful results
        for (i, result) in enumerate(results)
            if result !== nothing
                push!(sanitized_issues, result)
            end
            push!(sanitization_logs, logs[i])
        end
        
    else
        @info "Using sequential processing"
        
        for issue in issues
            result = sanitize_issue(sanitizer, issue)
            if result !== nothing
                push!(sanitized_issues, result)
                push!(sanitization_logs, result.sanitization_log)
            else
                push!(sanitization_logs, ["FILTERED: Failed sanitization"])
            end
        end
    end
    
    processing_time = time() - start_time
    
    # Generate comprehensive report
    report = generate_sanitization_report(
        length(issues),
        length(sanitized_issues),
        sanitization_logs,
        processing_time
    )
    
    @info "Batch sanitization completed"
    @info "  Input issues: $(length(issues))"
    @info "  Output issues: $(length(sanitized_issues))"
    @info "  Filtered out: $(report.filtered_count)"
    @info "  Processing time: $(round(processing_time, digits=2))s"
    
    return sanitized_issues, report
end

# Helper functions (implementations would be provided in practice)
function default_sanitizer_config()
    return Dict(
        "min_body_length" => 50,
        "strict_security" => true,
        "allow_research_use" => true,
        "banned_repositories" => String[],
        "banned_users" => String[],
        "quality_threshold" => 0.5,
        "safety_threshold" => 0.8
    )
end

function is_spam_content(title::String, body::String)::Bool
    spam_indicators = [
        r"(?i)(?:buy|sell|cheap|discount|offer|deal)\s+(?:now|here|today)",
        r"(?i)(?:click|visit|check)\s+(?:here|link|site)",
        r"(?i)(?:earn|make|get)\s+(?:money|\$\d+|cash)",
        r"[!]{3,}|[?]{3,}",  # Excessive punctuation
        length(split(title)) < 3,  # Very short titles
        length(body) < 20  # Very short body
    ]
    
    return any(
        isa(indicator, Regex) ? occursin(indicator, title * " " * body) : indicator
        for indicator in spam_indicators
    )
end

function contains_malicious_urls(text::String)::Bool
    # Check for suspicious URL patterns
    malicious_patterns = [
        r"(?i)(?:bit\.ly|tinyurl|t\.co)/[a-zA-Z0-9]+",  # Suspicious short URLs
        r"(?i)(?:download|install|click).*\.(?:exe|scr|bat|com)",
        r"(?i)(?:phish|hack|crack|warez)",
    ]
    
    return any(occursin(pattern, text) for pattern in malicious_patterns)
end

function contains_executable_content(text::String)::Bool
    executable_patterns = [
        r"(?i)base64.*(?:decode|exec|eval)",
        r"(?i)powershell.*(?:-enc|-encodedcommand)",
        r"(?i)curl.*\|.*(?:bash|sh|python)",
        r"(?i)wget.*(?:;|&&|\|\|)"
    ]
    
    return any(occursin(pattern, text) for pattern in executable_patterns)
end

function remove_sensitive_comments(code::String)::String
    # Remove comments that might contain sensitive information
    patterns = [
        r"(?:#|//|/\*).*(?:password|secret|key|token).*",
        r"(?:#|//).*TODO.*(?:remove|delete|fix).*(?:before|prior).*(?:production|release)",
        r"/\*.*(?:password|secret|key|token).*?\*/"
    ]
    
    clean_code = code
    for pattern in patterns
        clean_code = replace(clean_code, pattern => "")
    end
    
    return clean_code
end

function remove_hardcoded_credentials(code::String)::String
    # Remove hardcoded credentials from code
    credential_patterns = [
        r"(?i)(?:password|pwd)\s*[:=]\s*['\"][^'\"]{3,}['\"]" => "password = \"[REDACTED]\"",
        r"(?i)api_?key\s*[:=]\s*['\"][a-zA-Z0-9]{8,}['\"]" => "api_key = \"[REDACTED]\"",
        r"(?i)secret\s*[:=]\s*['\"][^'\"]{8,}['\"]" => "secret = \"[REDACTED]\""
    ]
    
    clean_code = code
    for (pattern, replacement) in credential_patterns
        clean_code = replace(clean_code, pattern => replacement)
    end
    
    return clean_code
end

function is_safe_code(code::String)::Bool
    # Check if code snippet is safe for training
    dangerous_patterns = [
        r"(?i)(?:eval|exec)\s*\(",
        r"(?i)(?:system|popen)\s*\(",
        r"(?i)(?:rm|del|format)\s+(?:-rf|/s|c:)",
        r"(?i)(?:__import__|getattr)\s*\(",
        r"(?i)subprocess.*shell\s*=\s*True"
    ]
    
    return !any(occursin(pattern, code) for pattern in dangerous_patterns)
end

function categorize_issue(issue::GitHubIssue, title::String, body::String)::String
    combined = lowercase(title * " " * body)
    
    if any(contains(combined, keyword) for keyword in ["bug", "error", "exception", "fail", "broken"])
        return "bug"
    elseif any(contains(combined, keyword) for keyword in ["feature", "enhancement", "improve", "add"])
        return "feature"
    elseif any(contains(combined, keyword) for keyword in ["security", "vulnerability", "exploit", "auth"])
        return "security"
    elseif any(contains(combined, keyword) for keyword in ["performance", "slow", "memory", "optimization"])
        return "performance"
    elseif any(contains(combined, keyword) for keyword in ["doc", "documentation", "readme", "comment"])
        return "documentation"
    else
        return "other"
    end
end

function estimate_difficulty(title::String, body::String, code::String)::String
    # Simple heuristic-based difficulty estimation
    complexity_indicators = [
        length(body) > 500,  # Detailed description
        !isempty(code),     # Contains code
        contains(lowercase(body), r"(?:complex|advanced|difficult|challenging)"),
        contains(lowercase(body), r"(?:algorithm|architecture|design pattern)"),
        contains(code, r"(?:class|interface|abstract|async|await)")
    ]
    
    complexity_score = sum(complexity_indicators)
    
    if complexity_score >= 4
        return "hard"
    elseif complexity_score >= 2
        return "medium"
    else
        return "easy"
    end
end

function extract_solution(issue::GitHubIssue, body::String)::String
    # Extract solution from issue body or comments
    solution_patterns = [
        r"(?i)(?:solution|fix|resolved):\s*(.*?)(?:\n\n|\n#|\Z)",
        r"(?i)(?:i fixed|i solved|the fix).*?:\s*(.*?)(?:\n\n|\n#|\Z)",
        r"```.*?```"  # Code blocks often contain solutions
    ]
    
    for pattern in solution_patterns
        matches = collect(eachmatch(pattern, body))
        if !isempty(matches)
            return strip(matches[1].captures[1])
        end
    end
    
    # Fallback: look in comments
    for comment in issue.comments
        comment_body = get(comment, "body", "")
        if contains(lowercase(comment_body), r"(?:fixed|solved|resolved)")
            return strip(comment_body[1:min(500, length(comment_body))])
        end
    end
    
    return ""
end

function extract_test_cases(issue::GitHubIssue)::Vector{String}
    # Extract test cases from issue content
    test_patterns = [
        r"(?i)(?:test|example|reproduce).*?```(.*?)```",
        r"(?i)(?:input|output|expected):\s*(.*?)(?:\n|$)"
    ]
    
    test_cases = String[]
    combined_text = issue.body * "\n" * join([get(c, "body", "") for c in issue.comments], "\n")
    
    for pattern in test_patterns
        matches = collect(eachmatch(pattern, combined_text))
        for match in matches
            if length(match.captures) > 0 && !isempty(match.captures[1])
                push!(test_cases, strip(match.captures[1]))
            end
        end
    end
    
    return unique(test_cases)
end

function extract_tags(issue::GitHubIssue, log::Vector{String})::Vector{String}
    # Clean and filter tags
    clean_tags = String[]
    
    for label in issue.labels
        clean_label = lowercase(strip(label))
        if !contains(clean_label, r"(?:spam|invalid|duplicate|wontfix)")
            push!(clean_tags, clean_label)
        end
    end
    
    push!(log, "PROCESSED: Extracted $(length(clean_tags)) tags")
    return clean_tags
end

function create_provenance_record(issue::GitHubIssue)::Dict{String, Any}
    return Dict(
        "source" => "GitHub",
        "repository" => issue.repository,
        "original_id" => issue.id,
        "created_at" => string(issue.created_at),
        "author_anonymous" => hash(issue.author),  # Anonymized
        "processing_timestamp" => string(now()),
        "data_version" => "1.0"
    )
end

function generate_anonymous_id(issue::GitHubIssue)::String
    # Generate deterministic but anonymous ID
    content_hash = sha256(issue.repository * string(issue.id) * issue.title)
    return "swe_" * bytes2hex(content_hash)[1:16]
end

end # module GitHubDataSanitizer
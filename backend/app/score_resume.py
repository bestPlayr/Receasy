"""
score_resume.py
===============
Standalone resume scorer — no FastAPI, no DB, no Google Sheets.

Usage
-----
  # Score a PDF against an inline job description:
  python score_resume.py resume.pdf --jd "We need a Python ML engineer with 3+ years..."

  # Score a PDF against a JD stored in a text file:
  python score_resume.py resume.pdf --jd-file job_description.txt

  # Interactive mode (prompts you to paste the JD):
  python score_resume.py resume.pdf

Output
------
  Prints the total AI score and a full breakdown to stdout.
  Use --json to get machine-readable JSON instead.

Dependencies (install once)
---------------------------
  pip install pymupdf pdfplumber python-docx sentence-transformers scikit-learn numpy torch
"""

from __future__ import annotations

import os
import re
import sys
import json
import math
import unicodedata
import logging
import argparse
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Iterable

import numpy as np

# ── Optional PDF / DOCX parsers ───────────────────────────────────────────────
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    from docx import Document as DocxDocument
except ImportError:
    DocxDocument = None

# ── ML deps ───────────────────────────────────────────────────────────────────
try:
    import torch
except ImportError:
    torch = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

from sklearn.metrics.pairwise import cosine_similarity

# ── Config (no external settings file needed) ─────────────────────────────────
EMBEDDING_MODEL_NAME = os.environ.get("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")
MODEL_CACHE_DIR = os.environ.get("MODEL_CACHE_DIR", os.path.join(os.path.dirname(__file__), "models_cache"))
DEVICE = "cuda" if (torch is not None and torch.cuda.is_available()) else "cpu"

logging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# =============================================================================
# Skill ontology
# =============================================================================

CANONICAL_SKILL_GROUPS: Dict[str, List[str]] = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#",
        "go", "rust", "kotlin", "swift", "r", "scala", "ruby", "php",
        "matlab", "perl", "bash", "shell scripting", "powershell", "lua",
    ],
    "ml_and_ai": [
        "machine learning", "deep learning", "neural networks", "computer vision",
        "natural language processing", "nlp", "reinforcement learning",
        "transfer learning", "generative ai", "large language models",
        "feature engineering", "model deployment", "mlops", "data science",
        "predictive modeling", "time series analysis", "anomaly detection",
        "recommendation systems", "object detection", "image segmentation",
        "transformer", "bert", "gpt", "stable diffusion", "rag",
        "retrieval augmented generation", "fine tuning", "prompt engineering",
        "agentic ai",
    ],
    "ml_frameworks": [
        "tensorflow", "pytorch", "keras", "scikit-learn", "xgboost", "lightgbm",
        "catboost", "hugging face", "transformers", "spacy", "nltk", "gensim",
        "opencv", "detectron2", "yolo", "fastai", "jax", "flax", "langchain",
        "llamaindex", "faiss", "chromadb",
    ],
    "data_engineering": [
        "sql", "mysql", "postgresql", "sqlite", "mongodb", "redis",
        "elasticsearch", "cassandra", "dynamodb", "bigquery", "snowflake",
        "apache spark", "pyspark", "hadoop", "kafka", "airflow", "dbt",
        "etl", "data pipeline", "data warehousing", "databricks",
    ],
    "cloud_and_devops": [
        "aws", "azure", "gcp", "google cloud", "docker", "kubernetes", "ci/cd",
        "jenkins", "github actions", "terraform", "ansible", "linux", "git",
        "github", "gitlab", "bitbucket", "helm", "prometheus", "grafana",
        "nginx", "microservices", "serverless",
    ],
    "web_and_api": [
        "fastapi", "flask", "django", "rest api", "graphql", "grpc", "react",
        "vue", "angular", "node.js", "express", "html", "css", "tailwind",
        "next.js", "websocket", "oauth", "jwt", "streamlit",
    ],
    "soft_skills": [
        "communication", "teamwork", "leadership", "problem solving",
        "critical thinking", "project management", "agile", "scrum",
        "time management", "collaboration", "mentoring", "presentation",
    ],
    "certifications": [
        "aws certified", "azure certified", "google certified",
        "tensorflow developer", "coursera", "udacity",
        "deep learning specialization", "pmp", "scrum master",
        "databricks certified", "ckad", "cka", "ielts", "toefl",
    ],
}

SKILL_ALIASES: Dict[str, str] = {
    "llm": "large language models",
    "llms": "large language models",
    "large language model": "large language models",
    "foundation models": "large language models",
    "genai": "generative ai",
    "gen ai": "generative ai",
    "generative artificial intelligence": "generative ai",
    "rag": "retrieval augmented generation",
    "retrieval-augmented generation": "retrieval augmented generation",
    "fine-tuning": "fine tuning",
    "finetuning": "fine tuning",
    "torch": "pytorch",
    "sklearn": "scikit-learn",
    "huggingface": "hugging face",
    "hugging face transformers": "transformers",
    "mongo": "mongodb",
    "nodejs": "node.js",
    "node js": "node.js",
    "reactjs": "react",
    "js": "javascript",
    "c sharp": "c#",
    "c plus plus": "c++",
    "ci cd": "ci/cd",
    "cicd": "ci/cd",
    "k8s": "kubernetes",
    "gcp": "google cloud",
    "google cloud platform": "google cloud",
    "amazon web services": "aws",
    "amazon web service": "aws",
    "ml ops": "mlops",
    "data pipelines": "data pipeline",
    "nlp": "natural language processing",
    "cv": "computer vision",
}

for _group in CANONICAL_SKILL_GROUPS.values():
    for _skill in _group:
        SKILL_ALIASES.setdefault(_skill, _skill)

ALL_CANONICAL_SKILLS: List[str] = sorted(set(SKILL_ALIASES.values()))

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
    "aug": 8, "august": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}


# =============================================================================
# Text utilities
# =============================================================================

def _clean_unicode(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    return text.encode("ascii", "ignore").decode("ascii", errors="ignore")


def _normalize_spaces(text: str) -> str:
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _normalize_for_search(text: str) -> str:
    text = _clean_unicode(text).lower()
    text = text.replace("&", " and ").replace("-", " ").replace("_", " ")
    text = text.replace("—", " ").replace("–", " ").replace("/", " / ")
    text = text.replace(".", " ")
    text = re.sub(r"[^a-z0-9\s\+\#\/]", " ", text)
    return _normalize_spaces(text)


def _make_skill_pattern(skill: str) -> re.Pattern:
    s = skill.strip().lower()
    escaped = re.escape(s)
    escaped = escaped.replace(r"\ ", r"\s+")
    escaped = escaped.replace(r"\-", r"[-\s]?")
    escaped = escaped.replace(r"\.", r"\.?")
    escaped = escaped.replace(r"\/", r"\/")
    return re.compile(rf"(?<!\w){escaped}(?!\w)", re.IGNORECASE)


# =============================================================================
# Text extraction
# =============================================================================

class TextExtractor:
    def extract_from_pdf_pymupdf(self, filepath: str) -> str:
        if fitz is None:
            return ""
        try:
            doc = fitz.open(filepath)
            text = "\n".join(page.get_text() for page in doc)
            doc.close()
            return text.strip()
        except Exception:
            return ""

    def extract_from_pdf_pdfplumber(self, filepath: str) -> str:
        if pdfplumber is None:
            return ""
        try:
            with pdfplumber.open(filepath) as pdf:
                text = "\n".join((page.extract_text() or "") for page in pdf.pages)
            return text.strip()
        except Exception:
            return ""

    def extract_from_docx(self, filepath: str) -> str:
        if DocxDocument is None:
            return ""
        try:
            doc = DocxDocument(filepath)
            parts = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text.strip():
                            parts.append(cell.text.strip())
            return "\n".join(parts).strip()
        except Exception:
            return ""

    def extract(self, filepath: str) -> str:
        ext = os.path.splitext(filepath)[1].lower()
        if ext == ".pdf":
            text = self.extract_from_pdf_pymupdf(filepath)
            if len(text) < 80:
                text = self.extract_from_pdf_pdfplumber(filepath)
            return text
        if ext in (".docx", ".doc"):
            return self.extract_from_docx(filepath)
        if ext == ".txt":
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        raise ValueError(f"Unsupported file format: {ext}")


# =============================================================================
# Preprocessing
# =============================================================================

class TextPreprocessor:
    URL_PATTERN   = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
    EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+", re.IGNORECASE)
    PHONE_PATTERN = re.compile(r"\+?[\d][\d\s\-().]{7,}[\d]")
    MULTI_SPACE   = re.compile(r"\s+")
    MULTI_NEWLINE = re.compile(r"\n{3,}")

    def clean(self, text: str, preserve_structure: bool = True) -> str:
        if not text:
            return ""
        text = _clean_unicode(text)
        text = self.URL_PATTERN.sub(" ", text)
        text = self.EMAIL_PATTERN.sub(" EMAIL ", text)
        text = self.PHONE_PATTERN.sub(" PHONE ", text)
        text = re.sub(r"[^\w\s.,/\-+#:()]", " ", text)
        text = self.MULTI_NEWLINE.sub("\n\n", text)
        text = self.MULTI_SPACE.sub(" ", text)
        if not preserve_structure:
            text = text.replace("\n", " ")
        return text.strip()

    def normalize_for_matching(self, text: str) -> str:
        return _normalize_for_search(self.clean(text, preserve_structure=False))


# =============================================================================
# Section parsing
# =============================================================================

class SectionParser:
    SECTION_HEADINGS = {
        "summary":        re.compile(r"^\s*(summary|profile|objective|about)\s*:?\s*$", re.I),
        "experience":     re.compile(r"^\s*(experience|work experience|employment|work history|professional experience)\s*:?\s*$", re.I),
        "education":      re.compile(r"^\s*(education|academic background|qualifications|academics)\s*:?\s*$", re.I),
        "skills":         re.compile(r"^\s*(skills?|technical skills|technologies|tech stack|expertise)\s*:?\s*$", re.I),
        "projects":       re.compile(r"^\s*(projects?|project experience|selected projects)\s*:?\s*$", re.I),
        "certifications": re.compile(r"^\s*(certifications?|certificates?|licenses|achievements|awards)\s*:?\s*$", re.I),
    }

    def split(self, text: str) -> Dict[str, str]:
        sections: Dict[str, str] = {}
        lines = text.split("\n")
        current_section = "header"
        buf: List[str] = []
        for line in lines:
            matched_section = None
            for sec_name, pattern in self.SECTION_HEADINGS.items():
                if pattern.match(line):
                    matched_section = sec_name
                    break
            if matched_section:
                sections[current_section] = "\n".join(buf).strip()
                current_section = matched_section
                buf = []
            else:
                buf.append(line)
        sections[current_section] = "\n".join(buf).strip()
        return sections


# =============================================================================
# Experience parsing
# =============================================================================

class ExperienceParser:
    DATE_RANGE = re.compile(
        r"(?P<sm>[a-zA-Z]+)?\s*(?P<sy>\d{4})\s*[-–—to]+\s*"
        r"(?:(?P<em>[a-zA-Z]+)?\s*(?P<ey>\d{4})|(?P<present>present|current|now|ongoing))",
        re.IGNORECASE,
    )

    def _parse_years(self, ranges: List[Tuple[int, int, int, int]]) -> float:
        if not ranges:
            return 0.0
        merged: List[Tuple[int, int]] = []
        for start, end in sorted((s, e) for s, _, e, __ in ranges):
            if merged and start <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], end))
            else:
                merged.append((start, end))
        total_months = sum(e - s for s, e in merged)
        return round(total_months / 12, 1)

    def extract_years(self, text: str) -> float:
        now_y, now_m = datetime.now().year, datetime.now().month
        now_abs = now_y * 12 + now_m
        ranges = []
        for m in self.DATE_RANGE.finditer(text):
            sy = int(m.group("sy"))
            sm_str = m.group("sm") or "jan"
            sm = _MONTHS.get(sm_str.lower(), 1)
            start_abs = sy * 12 + sm
            if m.group("present"):
                end_abs = now_abs
            else:
                ey = int(m.group("ey"))
                em_str = m.group("em") or "dec"
                em = _MONTHS.get(em_str.lower(), 12)
                end_abs = ey * 12 + em
            if end_abs >= start_abs and sy >= 1990:
                ranges.append((start_abs, sm, end_abs, 0))
        return self._parse_years(ranges)


# =============================================================================
# Education parsing
# =============================================================================

class EducationParser:
    LEVELS = {
        4: re.compile(r"\bph\.?d\b|\bdoctorate\b|\bphd\b", re.I),
        3: re.compile(r"\bmasters?\b|\bm\.?sc\b|\bmsc\b|\bm\.?tech\b|\bmtech\b|\bmba\b|\bms\b", re.I),
        2: re.compile(r"\bbachelor\b|\bb\.?sc\b|\bbsc\b|\bb\.?tech\b|\bbtech\b|\bbs\b|\bbe\b|\bundergraduate\b", re.I),
        1: re.compile(r"\bintermediate\b|\bhigh school\b|\bsecondary\b|\bdiploma\b", re.I),
    }

    def extract_level(self, text: str) -> int:
        for level in [4, 3, 2, 1]:
            if self.LEVELS[level].search(text):
                return level
        return 0


# =============================================================================
# Skill matching
# =============================================================================

class SkillMatcher:
    def __init__(self, canonical_groups: Dict, aliases: Dict):
        self.canonical_groups = canonical_groups
        self.aliases = {k.lower(): v for k, v in aliases.items()}
        self._compiled: Dict[str, re.Pattern] = {}

    def normalize_skill(self, raw: str) -> str:
        n = _normalize_for_search(raw)
        return self.aliases.get(n, n)

    def _pattern(self, skill: str) -> re.Pattern:
        if skill not in self._compiled:
            self._compiled[skill] = _make_skill_pattern(skill)
        return self._compiled[skill]

    def extract_skills(self, normalized_text: str) -> Dict:
        found: Dict[str, str] = {}
        for alias, canonical in self.aliases.items():
            if self._pattern(alias).search(normalized_text):
                found[canonical] = canonical
        by_group: Dict[str, List[str]] = {g: [] for g in self.canonical_groups}
        for canonical in found.values():
            for group, skills in self.canonical_groups.items():
                if canonical in skills:
                    by_group[group].append(canonical)
        all_skills = sorted(set(found.values()))
        return {"all": all_skills, "by_group": by_group, "count": len(all_skills)}

    def extract_from_sections(self, sections: Dict[str, str]) -> Dict:
        combined = " ".join(
            sections.get(s, "") for s in ("skills", "experience", "projects", "summary")
        )
        return self.extract_skills(_normalize_for_search(combined))

    def compare(self, resume_skills: Iterable[str], jd_skills: Iterable[str]) -> Dict:
        resume_set = {self.normalize_skill(s) for s in resume_skills if s}
        jd_set = {self.normalize_skill(s) for s in jd_skills if s}
        resume_set.discard("")
        jd_set.discard("")
        matched = sorted(resume_set & jd_set)
        missing = sorted(jd_set - resume_set)
        extra = sorted(resume_set - jd_set)
        score = (len(matched) / len(jd_set)) if jd_set else 0.0
        return {
            "match_score": round(score, 4),
            "matched": matched,
            "missing": missing,
            "extra": extra,
        }


# =============================================================================
# Identity extraction
# =============================================================================

def extract_identity(text: str) -> Dict[str, Optional[str]]:
    email_pat = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
    phone_pat = re.compile(r"(\+?\d[\d\s\-().]{7,}\d)")
    linkedin_pat = re.compile(r"linkedin\.com/in/[\w\-]+", re.I)
    github_pat = re.compile(r"github\.com/[\w\-]+", re.I)
    email_m = email_pat.search(text)
    phone_m = phone_pat.search(text)
    linkedin_m = linkedin_pat.search(text)
    github_m = github_pat.search(text)
    first_lines = [l.strip() for l in text.split("\n")[:6] if l.strip()]
    candidate_name = first_lines[0] if first_lines else "Unknown"
    return {
        "candidate_name": candidate_name,
        "email": email_m.group() if email_m else None,
        "phone": phone_m.group() if phone_m else None,
        "linkedin": linkedin_m.group() if linkedin_m else None,
        "github": github_m.group() if github_m else None,
    }


# =============================================================================
# Resume structure extractor
# =============================================================================

class ResumeStructureExtractor:
    def __init__(self):
        self.section_parser = SectionParser()
        self.exp_parser = ExperienceParser()
        self.edu_parser = EducationParser()

    def full_extraction(self, resume_text: str) -> Dict:
        sections = self.section_parser.split(resume_text)
        exp_text = sections.get("experience", "") + "\n" + sections.get("header", "")
        experience_years = self.exp_parser.extract_years(exp_text)
        edu_text = sections.get("education", "") + "\n" + resume_text[:500]
        education_level = self.edu_parser.extract_level(edu_text)
        cert_section = sections.get("certifications", "")
        cert_lines = [l.strip() for l in cert_section.split("\n") if l.strip() and len(l.strip()) > 5]
        certifications = cert_lines[:10]
        return {
            "sections": sections,
            "experience_years": experience_years,
            "education_level": education_level,
            "certifications": certifications,
        }


# =============================================================================
# Semantic similarity (BGE embeddings)
# =============================================================================

class Resume2Vec:
    QUERY_PREFIX = "Represent this sentence for searching relevant passages: "
    _model: Optional["SentenceTransformer"] = None
    _loaded_model_name: Optional[str] = None

    def __init__(self, model_name: str = EMBEDDING_MODEL_NAME, device: str = DEVICE):
        if SentenceTransformer is None:
            raise ImportError(
                "sentence-transformers is not installed.\n"
                "Run: pip install sentence-transformers torch"
            )
        os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
        if Resume2Vec._model is None or Resume2Vec._loaded_model_name != model_name:
            model_local_path = os.path.join(MODEL_CACHE_DIR, model_name.replace("/", "_"))
            if os.path.isdir(model_local_path):
                print(f"[Model] Loading from local cache: {model_local_path}", file=sys.stderr)
                Resume2Vec._model = SentenceTransformer(model_local_path, device=device)
            else:
                print(f"[Model] Downloading {model_name} (first run only)...", file=sys.stderr)
                Resume2Vec._model = SentenceTransformer(
                    model_name, device=device, cache_folder=MODEL_CACHE_DIR
                )
                Resume2Vec._model.save(model_local_path)
                print(f"[Model] Saved to {model_local_path}", file=sys.stderr)
            Resume2Vec._loaded_model_name = model_name
        self.model = Resume2Vec._model
        self.device = device

    def embed(self, text: str, is_query: bool = False) -> np.ndarray:
        input_text = (self.QUERY_PREFIX + text) if is_query else text
        emb = self.model.encode(
            [input_text],
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=True,
        ).astype(np.float32)
        norm = np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12
        return emb / norm

    def similarity(self, resume_text: str, jd_text: str) -> float:
        passage = self.embed(resume_text, is_query=False)
        query = self.embed(jd_text, is_query=True)
        return float(cosine_similarity(passage, query)[0][0])

    def weighted_similarity(self, resume_text: str, jd_text: str, sections: Dict[str, str]) -> Dict[str, float]:
        full = self.similarity(resume_text, jd_text)
        weighted_parts, weights = [], []
        section_weights = {"skills": 0.45, "experience": 0.30, "projects": 0.10, "education": 0.05}
        for sec, w in section_weights.items():
            if sections.get(sec):
                weighted_parts.append(self.similarity(sections[sec], jd_text))
                weights.append(w)
        weighted_parts.append(full)
        weights.append(0.10)
        weighted = float(np.average(np.array(weighted_parts), weights=np.array(weights)))
        return {
            "overall_similarity": round(full, 4),
            "weighted_similarity": round(weighted, 4),
        }


# =============================================================================
# Feature engineering
# =============================================================================

class FeatureEngineer:
    FEATURE_NAMES = [
        "skill_match_score", "skill_count", "semantic_overall", "semantic_weighted",
        "experience_match", "education_match", "certification_bonus",
        "missing_skill_penalty", "skills_breadth", "jd_coverage_ratio",
    ]

    def __init__(self, structure_extractor, skill_matcher, resume2vec):
        self.structure_extractor = structure_extractor
        self.skill_matcher = skill_matcher
        self.resume2vec = resume2vec

    def _experience_match_score(self, resume_years: float, jd_text: str) -> float:
        jd_clean = _normalize_for_search(jd_text)
        matches = re.findall(r"\b(\d+(?:\.\d+)?)\s*\+?\s*years?\b", jd_clean)
        if not matches:
            return 0.70
        required = max(map(float, matches))
        if required <= 0:
            return 1.0
        ratio = resume_years / required
        if ratio >= 1.0: return 1.0
        if ratio >= 0.8: return 0.75
        if ratio >= 0.6: return 0.50
        if ratio >= 0.4: return 0.30
        if ratio >= 0.2: return 0.12
        return 0.05

    def _education_match_score(self, resume_edu: int, jd_text: str) -> float:
        jd_clean = _normalize_for_search(jd_text)
        if re.search(r"\bph\.?d\b|\bphd\b|\bdoctorate\b", jd_clean):
            required = 4
        elif re.search(r"\bmasters?\b|\bm\.?sc\b|\bmsc\b|\bm\.?tech\b|\bmba\b|\bms in\b", jd_clean):
            required = 3
        elif re.search(r"\bintermediate\b|\bhigh school\b|\bsecondary\b|\bdiploma\b", jd_clean):
            required = 1
        else:
            required = 2
        return float(np.clip(resume_edu / required if required else 0.0, 0.0, 1.0))

    def _certification_bonus(self, certifications: List[str], jd_text: str) -> float:
        if not certifications:
            return 0.0
        jd_clean = _normalize_for_search(jd_text)
        hits = sum(
            1 for cert in certifications
            if _normalize_for_search(cert) in jd_clean
            or any(t in jd_clean for t in _normalize_for_search(cert).split() if len(t) > 3)
        )
        return min(hits / max(len(certifications), 1), 1.0)

    def _skills_breadth(self, resume_skills: List[str]) -> float:
        rs = set(resume_skills)
        hits = sum(
            1 for skills in self.skill_matcher.canonical_groups.values()
            if any(self.skill_matcher.normalize_skill(s) in rs for s in skills)
        )
        return hits / max(len(self.skill_matcher.canonical_groups), 1)

    def compute_features(self, resume_text: str, jd_text: str, preprocessed_resume: Optional[str] = None) -> Tuple[Dict, Dict]:
        resume_clean = preprocessed_resume or _normalize_for_search(resume_text)
        resume_struct = self.structure_extractor.full_extraction(resume_text)
        resume_skills_info = self.skill_matcher.extract_from_sections(resume_struct["sections"])
        jd_skills_info = self.skill_matcher.extract_skills(_normalize_for_search(jd_text))
        skill_comparison = self.skill_matcher.compare(resume_skills_info["all"], jd_skills_info["all"])
        sem = self.resume2vec.weighted_similarity(resume_text, jd_text, resume_struct["sections"])
        exp_score = self._experience_match_score(resume_struct["experience_years"], jd_text)
        edu_score = self._education_match_score(resume_struct["education_level"], jd_text)
        cert_bonus = self._certification_bonus(resume_struct["certifications"], jd_text)
        n_jd_skills = len(jd_skills_info["all"])
        n_matched = len(skill_comparison["matched"])
        missing_penalty = 1.0 - skill_comparison["match_score"]
        breadth = self._skills_breadth(resume_skills_info["all"])
        jd_coverage = (n_matched / n_jd_skills) if n_jd_skills > 0 else 0.0
        features = {
            "skill_match_score": skill_comparison["match_score"],
            "skill_count": min(resume_skills_info["count"] / 40.0, 1.0),
            "semantic_overall": sem["overall_similarity"],
            "semantic_weighted": sem["weighted_similarity"],
            "experience_match": exp_score,
            "education_match": edu_score,
            "certification_bonus": cert_bonus,
            "missing_skill_penalty": missing_penalty,
            "skills_breadth": breadth,
            "jd_coverage_ratio": jd_coverage,
        }
        metadata = {
            "resume_struct": resume_struct,
            "resume_skills": resume_skills_info,
            "jd_skills": jd_skills_info,
            "skill_comparison": skill_comparison,
            "semantic_result": sem,
            "clean_resume": resume_clean,
            "clean_jd": _normalize_for_search(jd_text),
        }
        return features, metadata

    def features_to_array(self, features: Dict) -> np.ndarray:
        return np.array([features[f] for f in self.FEATURE_NAMES], dtype=np.float32)


# =============================================================================
# Scoring model
# =============================================================================

class SimpleScoringModel:
    CATEGORIES = {
        (90, 101): "Excellent ⭐⭐⭐",
        (75,  90): "Strong ⭐⭐",
        (60,  75): "Good ⭐",
        (45,  60): "Average",
        (0,   45): "Below Threshold",
    }
    WEIGHTS = {
        "skill_match_score":     30.0,
        "semantic_overall":      16.0,
        "semantic_weighted":     10.0,
        "experience_match":      22.0,
        "education_match":        6.0,
        "certification_bonus":    4.0,
        "skill_count":            4.0,
        "skills_breadth":         4.0,
        "jd_coverage_ratio":      4.0,
        "missing_skill_penalty": -12.0,
    }

    def predict_score(self, feature_array: np.ndarray, feature_names: List[str]) -> float:
        feats = dict(zip(feature_names, feature_array.tolist()))
        raw = sum(feats.get(n, 0.0) * w for n, w in self.WEIGHTS.items())
        return round(float(np.clip(raw, 0.0, 100.0)), 2)

    def classify(self, score: float) -> str:
        for (lo, hi), label in self.CATEGORIES.items():
            if lo <= score < hi:
                return label
        return "Below Threshold"


# =============================================================================
# Main ranker
# =============================================================================

class ResumeRanker:
    def __init__(self):
        extractor = TextExtractor()
        preprocessor = TextPreprocessor()
        structure_extractor = ResumeStructureExtractor()
        skill_matcher = SkillMatcher(CANONICAL_SKILL_GROUPS, SKILL_ALIASES)
        resume2vec = Resume2Vec()
        feature_engineer = FeatureEngineer(structure_extractor, skill_matcher, resume2vec)
        scorer = SimpleScoringModel()
        self.extractor = extractor
        self.preprocessor = preprocessor
        self.feature_engineer = feature_engineer
        self.scorer = scorer

    def score(
        self,
        resume_path: str,
        jd_text: str,
    ) -> Dict:
        """
        Score a single resume PDF/DOCX/TXT against a job description.

        Parameters
        ----------
        resume_path : str
            Path to the resume file (PDF, DOCX, or TXT).
        jd_text : str
            Raw job description text.

        Returns
        -------
        dict with keys:
            final_score       – 0–100 float
            category          – human label (Excellent / Strong / Good / Average / Below Threshold)
            score_breakdown   – weighted component scores
            skill_match_pct   – % of JD skills found in resume
            matched_skills    – list of matched skills
            missing_skills    – list of missing skills
            experience_years  – parsed years of experience
            education_level   – 0–4 integer (0=unknown, 2=bachelor, 3=master, 4=PhD)
            certifications    – list of cert strings found
            semantic_similarity – cosine similarity of resume vs JD
            candidate_name    – inferred from first line of resume
            email / phone / linkedin / github
            explanation       – human-readable summary
        """
        resume_text = self.extractor.extract(resume_path)
        if not resume_text.strip():
            raise ValueError(f"Could not extract text from: {resume_path}")

        identity = extract_identity(resume_text)
        clean_resume = self.preprocessor.normalize_for_matching(resume_text)
        features, metadata = self.feature_engineer.compute_features(
            resume_text=resume_text, jd_text=jd_text, preprocessed_resume=clean_resume
        )
        feature_array = self.feature_engineer.features_to_array(features)
        score = self.scorer.predict_score(feature_array, self.feature_engineer.FEATURE_NAMES)
        category = self.scorer.classify(score)

        edu_map = {0: "unknown", 1: "Intermediate / High School", 2: "Bachelor's", 3: "Master's", 4: "PhD"}
        explanation = self._build_explanation(score, metadata, features)

        return {
            "candidate_name":      identity["candidate_name"],
            "email":               identity["email"],
            "phone":               identity["phone"],
            "linkedin":            identity["linkedin"],
            "github":              identity["github"],
            "final_score":         score,
            "category":            category,
            "score_breakdown": {
                "skill_match     (30%)": round(features["skill_match_score"] * 30, 2),
                "experience      (22%)": round(features["experience_match"] * 22, 2),
                "semantic_overall(16%)": round(features["semantic_overall"] * 16, 2),
                "semantic_weighted(10%)": round(features["semantic_weighted"] * 10, 2),
                "missing_penalty(-12%)": round(features["missing_skill_penalty"] * -12, 2),
                "education        (6%)": round(features["education_match"] * 6, 2),
                "certifications   (4%)": round(features["certification_bonus"] * 4, 2),
                "skill_count      (4%)": round(features["skill_count"] * 4, 2),
                "skills_breadth   (4%)": round(features["skills_breadth"] * 4, 2),
                "jd_coverage      (4%)": round(features["jd_coverage_ratio"] * 4, 2),
            },
            "raw_features":        {k: round(float(v), 4) for k, v in features.items()},
            "skill_match_pct":     round(metadata["skill_comparison"]["match_score"] * 100, 1),
            "matched_skills":      metadata["skill_comparison"]["matched"],
            "missing_skills":      metadata["skill_comparison"]["missing"],
            "extra_skills":        metadata["skill_comparison"]["extra"],
            "experience_years":    metadata["resume_struct"]["experience_years"],
            "education_level":     edu_map.get(metadata["resume_struct"]["education_level"], "unknown"),
            "certifications":      metadata["resume_struct"]["certifications"],
            "semantic_similarity": round(metadata["semantic_result"]["overall_similarity"], 4),
            "explanation":         explanation,
        }

    def _build_explanation(self, score: float, metadata: Dict, features: Dict) -> str:
        comp = metadata["skill_comparison"]
        sem  = metadata["semantic_result"]
        rs   = metadata["resume_struct"]

        matched_pct = round(comp["match_score"] * 100, 1)
        sem_score = sem["overall_similarity"]
        if sem_score >= 0.80:   sem_desc = "very high"
        elif sem_score >= 0.60: sem_desc = "high"
        elif sem_score >= 0.40: sem_desc = "moderate"
        else:                   sem_desc = "low"

        edu_map = {0: "unknown", 1: "intermediate / high school", 2: "bachelor's", 3: "master's", 4: "PhD"}
        lines = [
            f"Skills matched  : {matched_pct}% of JD requirements",
            f"Semantic match  : {sem_desc} ({sem_score:.2f})",
            f"Experience      : ~{rs['experience_years']:.1f} years",
            f"Education       : {edu_map.get(rs['education_level'], 'unknown')}",
            "",
            "Weighted contributions to score:",
            f"  Skill match       (+{features['skill_match_score']*30:.1f} / 30)",
            f"  Experience        (+{features['experience_match']*22:.1f} / 22)",
            f"  Semantic overall  (+{features['semantic_overall']*16:.1f} / 16)",
            f"  Semantic weighted (+{features['semantic_weighted']*10:.1f} / 10)",
            f"  Education         (+{features['education_match']*6:.1f} / 6)",
            f"  Certifications    (+{features['certification_bonus']*4:.1f} / 4)",
            f"  Skills breadth    (+{features['skills_breadth']*4:.1f} / 4)",
            f"  JD coverage       (+{features['jd_coverage_ratio']*4:.1f} / 4)",
            f"  Skill count       (+{features['skill_count']*4:.1f} / 4)",
            f"  Missing penalty   (-{features['missing_skill_penalty']*12:.1f} / 12)",
        ]
        if comp.get("matched"):
            lines += ["", f"Matched skills  : {', '.join(comp['matched'][:8])}"]
        if comp.get("missing"):
            lines += [f"Missing skills  : {', '.join(comp['missing'][:8])}"]
        return "\n".join(lines)


# =============================================================================
# Pretty printer
# =============================================================================

def _print_result(result: Dict) -> None:
    sep = "=" * 60
    print(sep)
    print(f"  RESUME SCORE REPORT")
    print(sep)
    print(f"  Candidate  : {result['candidate_name']}")
    if result.get("email"):    print(f"  Email      : {result['email']}")
    if result.get("phone"):    print(f"  Phone      : {result['phone']}")
    if result.get("linkedin"): print(f"  LinkedIn   : {result['linkedin']}")
    if result.get("github"):   print(f"  GitHub     : {result['github']}")
    print(sep)
    print(f"  TOTAL SCORE : {result['final_score']} / 100")
    print(f"  CATEGORY    : {result['category']}")
    print(sep)
    print("\n  SCORE BREAKDOWN")
    print("  " + "-" * 40)
    for label, pts in result["score_breakdown"].items():
        bar_len = int(abs(pts) / 30 * 20)
        sign = "-" if pts < 0 else "+"
        bar = (sign * bar_len).ljust(21)
        print(f"  {label:<28} {sign}{abs(pts):>5.2f}  {bar}")
    print()
    print("  DETAILS")
    print("  " + "-" * 40)
    print(f"  Skill match     : {result['skill_match_pct']}%")
    print(f"  Semantic sim.   : {result['semantic_similarity']}")
    print(f"  Experience      : {result['experience_years']} yrs")
    print(f"  Education       : {result['education_level']}")
    if result.get("certifications"):
        print(f"  Certifications  : {', '.join(result['certifications'][:4])}")
    print()
    if result.get("matched_skills"):
        print(f"  Matched skills  : {', '.join(result['matched_skills'])}")
    if result.get("missing_skills"):
        print(f"  Missing skills  : {', '.join(result['missing_skills'])}")
    print()
    print("  EXPLANATION")
    print("  " + "-" * 40)
    for line in result["explanation"].split("\n"):
        print(f"  {line}")
    print(sep)


# =============================================================================
# CLI entry point
# =============================================================================

def _get_jd_interactive() -> str:
    print("Paste the job description below. When done, enter a blank line followed by EOF")
    print("(on Windows press Ctrl+Z then Enter; on Mac/Linux press Ctrl+D):\n")
    lines = []
    try:
        for line in sys.stdin:
            lines.append(line)
    except EOFError:
        pass
    return "\n".join(lines).strip()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Score a resume PDF against a job description.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("resume", help="Path to resume file (PDF / DOCX / TXT)")
    jd_group = parser.add_mutually_exclusive_group()
    jd_group.add_argument("--jd", metavar="TEXT", help="Job description as a string")
    jd_group.add_argument("--jd-file", metavar="FILE", help="Path to a text file containing the job description")
    parser.add_argument("--json", action="store_true", help="Output raw JSON instead of formatted report")
    args = parser.parse_args()

    if not os.path.isfile(args.resume):
        print(f"ERROR: Resume file not found: {args.resume}", file=sys.stderr)
        sys.exit(1)

    if args.jd:
        jd_text = args.jd
    elif args.jd_file:
        if not os.path.isfile(args.jd_file):
            print(f"ERROR: JD file not found: {args.jd_file}", file=sys.stderr)
            sys.exit(1)
        with open(args.jd_file, "r", encoding="utf-8", errors="ignore") as f:
            jd_text = f.read().strip()
    else:
        jd_text = _get_jd_interactive()

    if not jd_text:
        print("ERROR: Job description is empty.", file=sys.stderr)
        sys.exit(1)

    print("[*] Loading model and scoring resume...", file=sys.stderr)
    ranker = ResumeRanker()
    result = ranker.score(resume_path=args.resume, jd_text=jd_text)

    if args.json:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        _print_result(result)


# Allow importing this file as a module too
def score_resume(resume_path: str, jd_text: str) -> float:
    """
    Convenience function for use as a Python module.

    Returns the AI resume score as a float between 0 and 100.

    Example
    -------
    from score_resume import score_resume
    ai_score = score_resume("my_resume.pdf", "We need a senior Python engineer...")
    print(ai_score)  # e.g. 83.47
    """
    ranker = ResumeRanker()
    result = ranker.score(resume_path=resume_path, jd_text=jd_text)
    return float(result["final_score"])


if __name__ == "__main__":
    main()

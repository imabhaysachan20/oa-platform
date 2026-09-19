import pytest
from pydantic import ValidationError
from backend.app.schemas.question import QuestionCreate
from backend.app.api.admin import TemplateGenerateRequest


def test_function_name_valid_identifiers():
    """Verify that standard programming identifiers are accepted."""
    valid_names = ["isAnagram", "twoSum", "reverseList", "solve", "binary_search_2", "_internalHelper"]
    for name in valid_names:
        q = QuestionCreate(
            title="Test Problem",
            description="Test problem description",
            question_type="coding",
            function_name=name,
            parameters=[{"name": "nums", "type": "int[]"}, {"name": "target", "type": "int"}],
            return_type="int[]",
        )
        assert q.function_name == name


def test_function_name_rejects_spaces_and_invalid_formats():
    """Verify that function names with spaces or special characters raise ValidationError."""
    invalid_names = [
        "is anagram",
        "two sum",
        "is-anagram",
        "2sum",
        "solve()",
        "calculate sum",
        "func$name",
        "valid?",
    ]
    for name in invalid_names:
        with pytest.raises(ValidationError) as exc_info:
            QuestionCreate(
                title="Test Problem",
                description="Test description",
                question_type="coding",
                function_name=name,
                parameters=[{"name": "nums", "type": "int[]"}],
            )
        assert "Invalid function name" in str(exc_info.value)


def test_parameter_name_validation():
    """Verify that parameter names with spaces or invalid chars are rejected."""
    # Valid parameter names pass
    q = QuestionCreate(
        title="Test Problem",
        description="Test description",
        question_type="coding",
        function_name="isAnagram",
        parameters=[{"name": "s", "type": "string"}, {"name": "t", "type": "string"}],
    )
    assert len(q.parameters) == 2

    # Invalid parameter names fail
    with pytest.raises(ValidationError) as exc_info:
        QuestionCreate(
            title="Test Problem",
            description="Test description",
            question_type="coding",
            function_name="isAnagram",
            parameters=[{"name": "first string", "type": "string"}],
        )
    assert "Invalid parameter name" in str(exc_info.value)


def test_template_generate_request_validation():
    """Verify TemplateGenerateRequest enforces identifier naming."""
    # Valid
    req = TemplateGenerateRequest(
        function_name="isAnagram",
        parameters=[{"name": "s", "type": "string"}, {"name": "t", "type": "string"}],
        return_type="bool"
    )
    assert req.function_name == "isAnagram"

    # Space in function name
    with pytest.raises(ValidationError) as exc_info:
        TemplateGenerateRequest(
            function_name="is anagram",
            parameters=[{"name": "s", "type": "string"}],
            return_type="bool"
        )
    assert "Invalid function name" in str(exc_info.value)

    # Space in parameter name
    with pytest.raises(ValidationError) as exc_info:
        TemplateGenerateRequest(
            function_name="isAnagram",
            parameters=[{"name": "string s", "type": "string"}],
            return_type="bool"
        )
    assert "Invalid parameter name" in str(exc_info.value)

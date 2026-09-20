import pytest
from backend.app.services.output_comparator import compare_outputs, normalize_output


def test_int_array_spacing_variations():
    # Exactly the user's issue: [1,2] vs [1, 2]
    assert compare_outputs("[1,2]", "[1, 2]")
    assert compare_outputs("[1, 2]", "[1,2]")
    assert compare_outputs("[0, 1, 2, 3, 4]", "[0,1,2,3,4]")
    assert compare_outputs("[]", "[]")
    assert compare_outputs("[ 1 , 2 ]", "[1, 2]")
    assert not compare_outputs("[1, 2]", "[1, 3]")


def test_2d_matrix_variations():
    assert compare_outputs("[[1,2],[3,4]]", "[[1, 2], [3, 4]]")
    assert compare_outputs("[[-1, -1, 2], [-1, 0, 1]]", "[[-1,-1,2],[-1,0,1]]")
    assert compare_outputs("[[0, 0, 0]]", "[[0,0,0]]")
    assert not compare_outputs("[[1, 2]]", "[[1, 3]]")


def test_string_quote_variations():
    assert compare_outputs("olleh", '"olleh"')
    assert compare_outputs('"olleh"', "olleh")
    assert compare_outputs("'hannaH'", '"hannaH"')
    assert compare_outputs('""', "")
    assert compare_outputs('"a"', "a")
    assert not compare_outputs('"abc"', '"def"')


def test_string_array_variations():
    assert compare_outputs('["a","b"]', '["a", "b"]')
    assert compare_outputs("['eat', 'tea']", '["eat", "tea"]')
    assert compare_outputs('[["bat"], ["nat", "tan"]]', '[["bat"],["nat","tan"]]')


def test_boolean_case_variations():
    assert compare_outputs("true", "true")
    assert compare_outputs("true", "True")
    assert compare_outputs("False", "false")
    assert compare_outputs("FALSE", "false")
    assert not compare_outputs("true", "false")


def test_float_variations():
    assert compare_outputs("3.14", "3.1400")
    assert compare_outputs("3.0", "3")
    assert compare_outputs("0.5", "0.500")
    assert compare_outputs("[1.0, 2.5]", "[1, 2.5]")


def test_linked_list_and_tree_variations():
    assert compare_outputs("[1,2,3]", "[1, 2, 3]")
    assert compare_outputs("[1, 2, 3, null, 4]", "[1,2,3,null,4]")
    assert compare_outputs("[]", "[]")


def test_whitespace_and_multiline():
    assert compare_outputs("1 2 3\n4 5", "1  2   3 \n 4   5")
    assert compare_outputs("hello\nworld\n", "hello\nworld")

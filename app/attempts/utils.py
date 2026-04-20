# attempt_utils.py
from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app import models, schemas 


def get_question_correct_answer(question: models.Question) -> Tuple[Optional[str], Optional[List[int]]]:
    """Возвращает (текст правильного ответа, список правильных опций) для вопроса."""
    qtype = question.question_type
    data = question.data

    if qtype == models.QuestionType.single_choice:
        correct_id = data["correct"][0]                     # получаем id правильного варианта
        # Ищем вариант с таким id
        correct_option = next((opt for opt in data["options"] if opt["id"] == correct_id), None)
        if correct_option is None:
            raise ValueError(f"Option with id {correct_id} not found")
        correct_text = correct_option["text"]               # текст правильного ответа
        correct_options = [correct_id]                      # список id (для проверки по id)
        return correct_text, correct_options

    elif qtype == models.QuestionType.multiple_choice:
        correct_indices = [i for i, opt in enumerate(data["options"]) if opt.get("weight", 0) > 0]
        correct_text = ", ".join(data["options"][i]["text"] for i in correct_indices)
        return correct_text, correct_indices

    elif qtype == models.QuestionType.open:
        keywords = data.get("keywords", [])
        correct_text = ", ".join(keywords)
        return correct_text, None

    return None, None


def calculate_question_score(question: models.Question, answer_data: Optional[dict]) -> float:
    """Вычисляет набранные баллы за вопрос."""
    qtype = question.question_type
    points = question.points



    if not answer_data:
        return 0.0

    selected_options = answer_data.get("selected_options")
    answer_text = answer_data.get("text")

    if qtype == models.QuestionType.single_choice:
        if not selected_options or len(selected_options) != 1:
            return 0.0
        correct = set(question.data["correct"])
        if set(selected_options) == correct:
            return points
        return 0.0

    elif qtype == models.QuestionType.multiple_choice:
        if not selected_options:
            return 0.0
        total_weight = 0.0
        earned_weight = 0.0
        for opt in question.data["options"]:
            weight = opt.get("weight", 0)
            total_weight += abs(weight)
            if opt.get("id") in selected_options:
                earned_weight += weight
        if total_weight == 0:
            return 0.0
        raw_score = (earned_weight / total_weight) * points
        return max(0.0, min(points, raw_score))

    elif qtype == models.QuestionType.open:
        if not answer_text:
            return 0.0
        keywords = question.data.get("keywords", [])
        case_sensitive = question.data.get("case_sensitive", False)
        if not case_sensitive:
            answer_text = answer_text.lower()
            keywords = [kw.lower() for kw in keywords]
        found = sum(1 for kw in keywords if kw in answer_text)
        if found == 0:
            return 0.0
        return (found / len(keywords)) * points

    return 0.0


def get_attempt_number(attempt_id: int, student_id: int, test_id: int, db: Session) -> int:
    """Возвращает порядковый номер попытки для студента по тесту."""
    count = db.query(models.TestAttempt).filter(
        models.TestAttempt.student_id == student_id,
        models.TestAttempt.test_id == test_id,
        models.TestAttempt.is_completed == True,
        models.TestAttempt.id <= attempt_id
    ).count()
    return count


def calculate_time_spent(started_at: datetime, completed_at: datetime) -> Optional[float]:
    """Время в минутах между началом и завершением."""
    if not completed_at:
        return None
    delta = completed_at - started_at
    return round(delta.total_seconds() / 60, 2)


def build_answer_detail(answer: models.Answer, question: models.Question):
    """Формирует AnswerDetail из схем."""
     # локальный импорт для избежания циклических зависимостей
    correct_text, correct_opts = get_question_correct_answer(question)
    return schemas.AnswerDetail(
        question_id=question.id,
        question_text=question.question_text,
        question_type=question.question_type,
        points=question.points,
        points_earned=answer.points_earned,
        is_correct=answer.is_correct,
        answer_data=answer.answer_data
    )
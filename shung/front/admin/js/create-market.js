(function () {
  'use strict';

  function initCreateMarket() {
    var draftBtn = document.getElementById('cm-save-draft');
    var submitBtn = document.getElementById('cm-submit');

    if (draftBtn) draftBtn.addEventListener('click', function () {
      if (!validateForm()) return;
      var data = collectFormData();
      window.showToast('success', '草稿已儲存',
        '事件「' + data.title + '」已儲存為草稿（DRAFT），可至事件列表檢視。');
      resetForm();
    });

    if (submitBtn) submitBtn.addEventListener('click', function () {
      if (!validateForm()) return;
      var data = collectFormData();
      window.showToast('success', '送審成功',
        '事件「' + data.title + '」已送審（PENDING），請至<a href="#" data-page="views/markets.html" class="alert-link">事件列表</a>進行核准。');
      resetForm();
    });
  }

  function collectFormData() {
    return {
      title: document.getElementById('cm-title').value,
      description: document.getElementById('cm-description').value,
      category: document.getElementById('cm-category').value,
      marketType: document.querySelector('input[name="marketType"]:checked').value,
      sourceUrl: document.getElementById('cm-sourceUrl').value,
      resolutionRule: document.getElementById('cm-resolutionRule').value,
      closeAt: document.getElementById('cm-closeAt').value
    };
  }

  function validateForm() {
    var ids = ['cm-title', 'cm-category', 'cm-resolutionRule', 'cm-closeAt'];
    var valid = true;
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        if (el) el.classList.add('is-invalid');
        valid = false;
      } else {
        if (el) el.classList.remove('is-invalid');
      }
    });
    if (!valid) {
      window.showToast('danger', '欄位不足', '請填寫所有必填欄位（標題、分類、裁決規則、截止時間）。');
    }
    return valid;
  }

  function resetForm() {
    document.getElementById('create-market-form').reset();
    document.querySelectorAll('.is-invalid').forEach(function (el) {
      el.classList.remove('is-invalid');
    });
  }

  window.initCreateMarket = initCreateMarket;
})();

class PalateRecording {
   constructor(id, audioUrl, title, author, description, siteName, text, previewImage, originalArticleUrl, articleId) {
      this.id = id
      this.audioUrl = audioUrl
      this.title = title
      this.author = author
      this.description = description
      this.siteName = siteName
      this.text = text
      this.previewImage = previewImage
      this.originalArticleUrl = originalArticleUrl
      this.articleId = articleId
   }
}
// article will essentially match readability structure plus my added url and previewImage
class Article {
   constructor() {

   }
}
class DBUser {
   constructor(email, id, palates) {
      this.id = id
      this.email = email
      this.palates = palates // array of strings that are palate id's
   }
}
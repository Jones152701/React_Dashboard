def generate_wordcloud(messages, max_words=200):
    import re
    from collections import Counter

    stopwords = set([
                        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", "you've", 
                        "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 
                        'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its', 'itself', 'they', 'them', 
                        'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 
                        'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
                        'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 
                        'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 
                        'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 
                        'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 
                        'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 
                        'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 
                        'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should', "should've", 
                        'now', 'aren', "aren't", 'couldn', "couldn't", 'didn', "didn't", 'doesn', "doesn't", 
                        'hadn', "hadn't", 'hasn', "hasn't", 'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', 
                        "mightn't", 'mustn', "mustn't", 'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 
                        'wasn', "wasn't", 'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't", 'really', 'very', 
                        'quite', 'too', 'much', 'many', 'also', 'even', 'still', 'just', 'already', 'yet', 'however', 
                        'therefore', 'thus', 'hence', 'consequently', 'meanwhile', 'nevertheless', 'nonetheless', 
                        'otherwise', 'instead', 'furthermore', 'moreover', 'additionally', 'besides', 'indeed', 
                        'actually', 'basically', 'essentially', 'literally', 'seriously', 'honestly', 'personally', 
                        'generally', 'usually', 'normally', 'typically', 'often', 'sometimes', 'rarely', 'never', 
                        'always', 'forever', 'constantly', 'continuously', 'this', 'that', 'these', 'those', 'any', 
                        'some', 'every', 'each', 'all', 'both', 'either', 'neither', 'another', 'such', 'what', 
                        'which', 'whose', 'a', 'an', 'the', 'and', 'but', 'or', 'if', 'because', 'as', 'until', 
                        'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 
                        'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 
                        'off', 'over', 'under', 'again', 'further', 'then', 'once', 'have', 'has', 'had', 'do', 'does', 
                        'did', 'say', 'says', 'said', 'go', 'goes', 'went', 'get', 'gets', 'got', 'make', 'makes', 
                        'made', 'know', 'knows', 'knew', 'think', 'thinks', 'thought', 'take', 'takes', 'took', 'see', 
                        'sees', 'saw', 'come', 'comes', 'came', 'want', 'wants', 'wanted', 'look', 'looks', 'looked', 
                        'use', 'uses', 'used', 'find', 'finds', 'found', 'give', 'gives', 'gave', 'tell', 'tells', 
                        'told', 'work', 'works', 'worked', 'called', 'got', 'get', 'one', 'back', 'go', 'went', 'see', 
                        'know', 'tell', 'come', 'time', 'day', 'week', 'month', 'year', 'people', 'thing', 'way', 
                        'said', 'say', 'also', 'well', 'even', 'new', 'first', 'last', 'good', 'bad', 'great', 'really', 
                        'please', 'help', 'need', 'want', 'thank', 'thanks',
                        # Additional foreign/common words
                        'est', 'que', 'pour', 'les', 'des', 'une', 'dans', 'par', 'sur', 'avec',
                        'tout', 'plus', 'bien', 'tres', 'fait', 'faire', 'etre', 'avoir', 'cest',
                        'ca', 'cela', 'cette', 'comme', 'chez', 'aussi', 'donc', 'enfin', 'voila',
                        'alors', 'toujours', 'jamais', 'pendant', 'depuis', 'entre', 'sans', 'sous'
                    ])
                    

    

    word_counter = Counter()

    for msg in messages:
        if not msg or not isinstance(msg, str) or not msg.strip():
            continue

        words = re.findall(r'\b\w+\b', msg.lower())
        word_counter.update(words)

    if not word_counter:
        return {}

    filtered_words = {
        word: count
        for word, count in word_counter.items()
        if word not in stopwords and len(word) > 3 and not word.isdigit()
    }

    if not filtered_words:
        return {}

    max_val = max(filtered_words.values())

    return {
        word: int((count / max_val) * 100)
        for word, count in sorted(filtered_words.items(), key=lambda x: x[1], reverse=True)[:max_words]
    }